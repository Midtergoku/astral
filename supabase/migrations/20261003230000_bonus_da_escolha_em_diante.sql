-- ============================================================================
-- O bonus da Instrucao vale da escolha EM DIANTE (03/10/2026)
-- Auditoria GAM-01 + GAM-12 -- roadmap 3.7. Decisao dele (pergunta 8): "bonus so
-- daqui para frente; a patente nunca desce por causa do bonus".
--
-- O QUE ESTAVA ERRADO (medido pela auditoria na conta `constante`):
--   xp_com_bonus recalculava TODAS as sessoes com as especializacoes de HOJE.
--   Escolher 6 especializacoes, sem estudar um minuto: 10.800 -> 15.756 XP,
--   Subtenente -> Aspirante. "Recomeçar do zero": de volta a Subtenente (DESCEU).
--   O "Alvo Prioritario" pior: quando a materia mais fraca mudava, o XP de todas
--   as sessoes passadas mudava junto. E os degraus de um ramo SOMAVAM (40+60+90
--   min = 5+10+15 = 30%), ate +150% com tudo.
--
-- O QUE PASSA A HAVER:
--   - cada sessao GRAVA, ao entrar, as especializacoes ativas e se a materia era a
--     mais fraca (gatilho sessao_habilidades). Escolher depois nao mexe no passado;
--     recomeçar nao tira o que ja foi ganho.
--   - regra_bonus 2 (sessoes novas): em cada ramo vale o MAIOR degrau cumprido
--     (teto +60%). As sessoes antigas ficam com a regra 1 (soma) -- mudar a conta
--     delas desceria a patente de quem ja tem.
--   - as sessoes que ja existiam recebem o retrato de HOJE (especializacoes e
--     materia mais fraca atuais): o XP de ninguem muda na publicacao.
--   O que continua do dia (horas, materias, sequencia) segue calculado do dia --
--   e isso so cresce: nada mais faz o XP descer, a nao ser apagar a sessao.
-- ============================================================================

alter table public.sessoes_estudo add column if not exists habilidades text[] not null default '{}';
alter table public.sessoes_estudo add column if not exists alvo boolean not null default false;
alter table public.sessoes_estudo add column if not exists regra_bonus smallint not null default 2
  check (regra_bonus in (1, 2));

-- A materia mais fraca de hoje (a mesma conta que xp_com_bonus sempre fez)
create or replace function public.materia_mais_fraca(p_uid uuid)
returns text language sql stable set search_path = public as $$
  select m->>'nome'
    from public.progresso p, jsonb_array_elements(p.materias) m
   where p.usuario_id = p_uid
   order by coalesce((m->>'progresso')::numeric, 0) asc
   limit 1;
$$;
revoke all on function public.materia_mais_fraca(uuid) from public, anon;
grant execute on function public.materia_mais_fraca(uuid) to authenticated, service_role;

-- ── o retrato das sessoes que ja existem: o de hoje, com a regra antiga ──────
update public.sessoes_estudo s set
  habilidades = coalesce((select array_agg(e.habilidade_id order by e.habilidade_id)
                            from public.habilidades_escolhidas e where e.usuario_id = s.usuario_id), '{}'),
  alvo = coalesce(lower(public.unaccent_simples(coalesce(s.materia, '')))
                  = lower(public.unaccent_simples(public.materia_mais_fraca(s.usuario_id))), false),
  regra_bonus = 1;

-- ── cada sessao nova grava o seu retrato ─────────────────────────────────────
create or replace function public.gravar_habilidades_da_sessao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fraca text := public.materia_mais_fraca(new.usuario_id);
begin
  -- o servidor decide; o que vier do navegador nesses campos e ignorado
  new.habilidades := coalesce((select array_agg(e.habilidade_id order by e.habilidade_id)
                                 from public.habilidades_escolhidas e where e.usuario_id = new.usuario_id), '{}');
  new.alvo := v_fraca is not null and lower(public.unaccent_simples(coalesce(new.materia, '')))
                                      = lower(public.unaccent_simples(v_fraca));
  new.regra_bonus := 2;
  return new;
end;
$$;
revoke all on function public.gravar_habilidades_da_sessao() from public, anon, authenticated;
drop trigger if exists sessao_habilidades on public.sessoes_estudo;
-- "sessao_h" roda depois de "sessao_confiavel" (gatilhos do mesmo momento vao em ordem alfabetica)
create trigger sessao_habilidades before insert on public.sessoes_estudo
  for each row execute function public.gravar_habilidades_da_sessao();

-- ── o bonus de uma sessao, pelas especializacoes GRAVADAS nela ──────────────
create or replace function public.bonus_gravado(
  p_habilidades text[], p_regra smallint, p_minutos numeric, p_sequencia integer,
  p_horas_no_dia numeric, p_materias_no_dia integer, p_alvo boolean)
returns numeric language sql stable set search_path = public as $$
  with cumpridas as (
    select h.ramo, h.bonus
      from public.catalogo_habilidades h
     where h.id = any(coalesce(p_habilidades, '{}'))
       and case h.regra
             when 'sequencia'        then p_sequencia       >= h.limiar
             when 'duracao'          then p_minutos         >= h.limiar
             when 'horasNoDia'       then p_horas_no_dia    >= h.limiar
             when 'materiasNoDia'    then p_materias_no_dia >= h.limiar
             when 'materiaMaisFraca' then p_alvo
             else false
           end
  )
  select case when p_regra = 1
    then (select coalesce(sum(bonus), 0) from cumpridas)                         -- regra antiga: soma
    else (select coalesce(sum(m), 0) from (select max(bonus) m from cumpridas group by ramo) r)  -- maior por ramo
  end;
$$;
revoke all on function public.bonus_gravado(text[], smallint, numeric, integer, numeric, integer, boolean) from public, anon;
grant execute on function public.bonus_gravado(text[], smallint, numeric, integer, numeric, integer, boolean) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.xp_com_bonus(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_base  integer := 0;
  v_total numeric := 0;
  v_fraca text;
begin
  select coalesce(sum(xp), 0) into v_base
  from public.sessoes_estudo where usuario_id = p_uid;

  -- A materia de menor dominio, para o 'Alvo Prioritario'.
  select m->>'nome' into v_fraca
  from public.progresso p, jsonb_array_elements(p.materias) m
  where p.usuario_id = p_uid
  order by coalesce((m->>'progresso')::numeric, 0) asc
  limit 1;

  with dias as (
    select x as d from public.dias_de_estudo(p_uid) x
  ),
  ilhas as (
    select d, d - (row_number() over (order by d))::integer as ilha from dias
  ),
  sequencias as (
    select d, row_number() over (partition by ilha order by d)::integer as seq from ilhas
  ),
  por_dia as (
    select (criado_em at time zone 'America/Sao_Paulo')::date as d,
           sum(segundos) / 3600.0 as horas,
           count(distinct materia) filter (where materia is not null) as materias
    from public.sessoes_estudo where usuario_id = p_uid group by 1
  )
  select coalesce(sum(
    -- 03/10/2026 (GAM-01): as especializacoes e a "materia mais fraca" sao as
    -- GRAVADAS NA SESSAO (do momento em que ela entrou), nao as de hoje.
    s.xp * (1 + public.bonus_gravado(
      s.habilidades,
      s.regra_bonus,
      s.segundos / 60.0,
      coalesce(sq.seq, 0),
      pd.horas,
      pd.materias::integer,
      s.alvo
    ))
  ), 0) into v_total
  from public.sessoes_estudo s
  -- 03/10/2026: dia com menos de 15 min nao entra na sequencia -- a sessao dele
  -- continua valendo XP, so sem o bonus de sequencia (left join, seq 0).
  left join sequencias sq on sq.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  join por_dia   pd on pd.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  where s.usuario_id = p_uid;

  return jsonb_build_object(
    'base',     v_base,
    'comBonus', floor(v_total)::integer,
    'pontos',   public.pontos_de_habilidade(v_base),
    'materiaMaisFraca', v_fraca
  );
end;
$function$;
