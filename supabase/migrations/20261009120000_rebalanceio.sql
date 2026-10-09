-- ============================================================================
-- Rebalanceamento: ligar/desligar e "Rebalancear agora" (09/10/2026) -- roadmap 3.26
-- Pedido dele: "um botao para desativar o rebalanceamento automatico toda segunda e um
-- botao para rebalancear manualmente. E para quem nao utilizar esse botao, um aviso que
-- toda segunda ele rebalanceia."
--
-- Como era: o cronograma usa o RETRATO do dominio (medida.semana), tirado com o que havia ate
-- a segunda-feira 00h (Sao Paulo) -- todo mundo, toda segunda, sem escolha.
--
-- O QUE PASSA A HAVER (em progresso.rotina.rebalanceio = { auto: true|false, em: ISO }):
--   - automatico (padrao): o corte e a segunda -- ou o ultimo "Rebalancear agora", se for depois
--   - desligado: o corte fica no ultimo "Rebalancear agora" (ou no momento em que desligou):
--     o plano so muda quando a pessoa pede
-- A rotina e da pessoa (ela ja grava nela): nenhuma permissao nova. Data invalida ou no futuro
-- nao quebra nada -- vira "agora" ou e ignorada.
-- ============================================================================

create or replace function public.corte_do_rebalanceio(p_rotina jsonb)
returns timestamptz language plpgsql stable set search_path = public as $$
declare
  v_seg  timestamptz := (date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  v_rb   jsonb := p_rotina -> 'rebalanceio';
  v_em   timestamptz;
  v_auto boolean := coalesce(v_rb ->> 'auto', 'true') <> 'false';
begin
  begin
    v_em := (v_rb ->> 'em')::timestamptz;
  exception when others then
    v_em := null;
  end;
  -- data no futuro vira "agora". (NAO usar least(v_em, now()): o least IGNORA o nulo e devolveria
  -- now() para quem nunca apertou o botao -- o retrato seria tirado a cada gravacao. O teste pegou.)
  if v_em > now() then
    v_em := now();
  end if;
  if not v_auto then
    return coalesce(v_em, v_seg);
  end if;
  return greatest(v_seg, coalesce(v_em, v_seg));
end $$;
revoke all on function public.corte_do_rebalanceio(jsonb) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dominio_calculado(p_uid uuid, p_materias jsonb, p_rotina jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with corte as (
    -- 09/10/2026 (3.26): o retrato da semana e tirado no corte do rebalanceamento (segunda, ou o
    -- "Rebalancear agora"), da ROTINA que chega -- no gatilho, a rotina NOVA, que ainda nao esta na tabela
    select public.corte_do_rebalanceio(p_rotina) as t
  ),
  ed as (
    select t.m, t.ord, public.materia_do_banco(t.m ->> 'nome') as banco
      from jsonb_array_elements(
             case when jsonb_typeof(p_materias) = 'array' then p_materias else '[]'::jsonb end
           ) with ordinality as t(m, ord)
     where jsonb_typeof(t.m) = 'object'
  ),
  acervo as (
    select materia, count(*) as n from public.questoes where publicada group by materia
  ),
  resp as (
    select q.materia,
           count(*) as n,
           count(*) filter (where r.vezes_errou = 0) as primeira,
           count(*) filter (where r.atualizado_em < (select t from corte)) as n_sem,
           count(*) filter (where r.vezes_errou = 0 and r.atualizado_em < (select t from corte)) as primeira_sem
      from public.respostas r
      join public.questoes q on q.id = r.questao_id
     where r.usuario_id = p_uid and r.questao_id is not null
     group by q.materia
  ),
  est as (
    select materia,
           sum(segundos) / 60.0 as minutos,
           coalesce(sum(segundos) filter (where criado_em < (select t from corte)), 0) / 60.0 as minutos_sem
      from public.sessoes_estudo where usuario_id = p_uid
     group by materia
  ),
  conta as (
    select ed.m, ed.ord, ed.banco,
           coalesce(a.n, 0)::integer            as acervo,
           coalesce(r.n, 0)::integer            as respondidas,
           coalesce(r.primeira, 0)::integer     as primeira,
           coalesce(e.minutos, 0)               as minutos,
           coalesce(r.n_sem, 0)::integer        as respondidas_sem,
           coalesce(r.primeira_sem, 0)::integer as primeira_sem,
           coalesce(e.minutos_sem, 0)           as minutos_sem
      from ed
      left join acervo a on a.materia = ed.banco
      left join resp   r on r.materia = ed.banco
      left join est    e on e.materia = ed.m ->> 'nome'
  )
  select coalesce(jsonb_agg(
           c.m || jsonb_build_object(
             'progresso', public.dominio_formula(c.acervo, c.respondidas, c.primeira, c.minutos),
             'medida', jsonb_build_object(
               'fonte',       case when c.acervo >= 10 then 'banco' else 'estudo' end,
               'banco',       c.banco,
               'respondidas', c.respondidas,
               'de_primeira', c.primeira,
               'alvo',        case when c.acervo >= 10 then least(30, c.acervo) else null end,
               'minutos',     round(c.minutos)::integer,
               'semana',      public.dominio_formula(c.acervo, c.respondidas_sem, c.primeira_sem, c.minutos_sem)))
           order by c.ord), '[]'::jsonb)
    from conta c;
$function$;
revoke all on function public.dominio_calculado(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.dominio_calculado(uuid, jsonb, jsonb) to service_role;

-- a versao de 2 parametros (quem chama sem a rotina) le a rotina guardada
create or replace function public.dominio_calculado(p_uid uuid, p_materias jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.dominio_calculado(p_uid, p_materias, (select rotina from public.progresso where usuario_id = p_uid));
$$;

CREATE OR REPLACE FUNCTION public.progresso_do_servidor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_xp integer;
begin
  if not public.gravacao_pelo_site() then
    return new;
  end if;
  v_xp := coalesce((public.xp_com_bonus(new.usuario_id) ->> 'comBonus')::integer, 0);
  new.xp          := v_xp;
  new.xp_validado := v_xp;
  new.horas  := round(coalesce((select sum(segundos) from public.sessoes_estudo
                                 where usuario_id = new.usuario_id), 0) / 3600.0, 1);
  new.streak := public.sequencia_do_usuario(new.usuario_id);
  -- 30/09/2026: o dominio que o navegador mandou deixa de valer.
  -- 09/10/2026 (3.26): com a rotina NOVA -- o "Rebalancear agora" vale na mesma gravacao
  new.materias := public.dominio_calculado(new.usuario_id, new.materias, new.rotina);
  return new;
end;
$function$;
