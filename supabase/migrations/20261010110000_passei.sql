-- ============================================================================
-- "PASSEI!" -- O FIM DA JORNADA (10/10/2026 -- jornada 7 da auditoria, roadmap 3.22)
--
-- Decisao dele (pergunta 17): "Concordo" -- um final para quem passa: comemoracao,
-- depoimento, e manter a conta para o proximo concurso.
--
-- aprovacoes   uma linha por concurso aprovado. O DEPOIMENTO e opcional e PRIVADO:
--              so o dono le. `pode_publicar` nasce FALSO e so vira verdadeiro se a
--              pessoa marcar, com o texto da autorizacao na tela. MOSTRAR depoimentos
--              em qualquer lugar publico (pagina inicial) e decisao do dono do Astral
--              -- nao existe ainda (guardado para ele).
-- RLS: cada um le, cria e altera as SUAS (depoimento e autorizacao). Ninguem apaga
-- pela tela (a conta inteira sai em "excluir conta", em cascata).
-- Entra no "baixar meus dados" (meus_dados) e no painel do dono (contagens).
-- ============================================================================

create table if not exists public.aprovacoes (
  id             bigint generated always as identity primary key,
  usuario_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concurso       text not null check (char_length(concurso) between 1 and 200),
  depoimento     text check (depoimento is null or char_length(depoimento) <= 1000),
  pode_publicar  boolean not null default false,
  criado_em      timestamptz not null default now(),
  unique (usuario_id, concurso)
);
alter table public.aprovacoes enable row level security;
revoke all on public.aprovacoes from public, anon, authenticated;
grant select, insert on public.aprovacoes to authenticated;
grant update (depoimento, pode_publicar) on public.aprovacoes to authenticated;
grant select, insert, update, delete on public.aprovacoes to service_role;

drop policy if exists aprovacoes_le_a_sua on public.aprovacoes;
create policy aprovacoes_le_a_sua on public.aprovacoes for select to authenticated using (usuario_id = auth.uid());
drop policy if exists aprovacoes_cria_a_sua on public.aprovacoes;
create policy aprovacoes_cria_a_sua on public.aprovacoes for insert to authenticated with check (usuario_id = auth.uid());
drop policy if exists aprovacoes_altera_a_sua on public.aprovacoes;
create policy aprovacoes_altera_a_sua on public.aprovacoes for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.meus_dados()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid   uuid := auth.uid();
  conta auth.users%rowtype;
  -- Toda tabela com usuario_id entra aqui. Tabela nova com dado do aluno?
  -- Acrescentar na lista -- o tools/testa-dados-do-aluno.js FALHA se uma
  -- tabela com usuario_id ficar de fora.
  tabelas text[] := array[
    'progresso', 'sessoes_estudo', 'eventos', 'conquistas', 'habilidades_escolhidas',
    'respostas', 'questoes_minhas', 'questoes_servidas', 'recursos_salvos',
    'taf_registros', 'uso_ia', 'consentimentos', 'erros_cliente', 'administradores',
    -- 03/10/2026: os erros que a pessoa reportou nas questoes (BAN-02)
    'questoes_reportadas',
    -- 03/10/2026: as etapas do funil e a origem do cadastro (NEG-01)
    'funil',
    -- 03/10/2026: "a leitura do edital esta errada" (EDI-03)
    'editais_reportados',
    -- 10/10/2026: o "Passei!" -- a aprovacao e o depoimento (roadmap 3.22)
    'aprovacoes'];
  t text;
  linhas jsonb;
  pacote jsonb;
begin
  if uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  select * into conta from auth.users where id = uid;

  pacote := jsonb_build_object(
    'exportado_em', now(),
    'origem', 'Astral — astral-psi.vercel.app',
    'conta', jsonb_build_object(
      'id', conta.id, 'email', conta.email, 'criada_em', conta.created_at,
      'ultimo_acesso', conta.last_sign_in_at,
      'forma_de_acesso', coalesce(conta.raw_app_meta_data->>'provider', 'email'),
      'nome', conta.raw_user_meta_data->>'full_name'),
    'perfil', (select to_jsonb(p) from public.perfis p where p.id = uid),
    'lista_de_espera', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
                          from public.lista_espera l where lower(l.email) = lower(conta.email)),
    'historico_de_plano', (select coalesce(jsonb_agg(jsonb_build_object(
                              'evento', a.evento, 'detalhe', a.detalhe, 'em', a.criado_em) order by a.criado_em), '[]'::jsonb)
                             from public.auditoria a where a.alvo_id = uid));

  foreach t in array tabelas loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.usuario_id = $1', t)
      into linhas using uid;
    pacote := pacote || jsonb_build_object(t, linhas);
  end loop;

  return pacote;
end;
$function$;

CREATE OR REPLACE FUNCTION public.painel_de_negocio(p_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dias   integer := greatest(0, least(coalesce(p_dias, 30), 365));
  v_desde  timestamptz;
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_res    jsonb;
begin
  if not public.sou_administrador() then
    raise exception 'apenas o administrador ve o painel' using errcode = '42501';
  end if;
  v_desde := case when v_dias = 0 then '-infinity'::timestamptz else now() - make_interval(days => v_dias) end;

  with reais as (
    select u.id, u.created_at from auth.users u
     where u.email is null or u.email not ilike '%@astral-teste.local'
  ),
  coorte as (select id from reais where created_at >= v_desde),
  etapas as (
    select f.usuario_id, f.etapa, f.origem from public.funil f join reais r on r.id = f.usuario_id
  ),
  origem_de as (
    select e.usuario_id,
      case
        when coalesce((e.origem->>'antes_do_funil')::boolean, false) then '(antes do funil)'
        when nullif(e.origem->>'utm_source', '') is not null then left(e.origem->>'utm_source', 60)
        when nullif(e.origem->>'ref', '') is not null then left(e.origem->>'ref', 60)
        when coalesce((e.origem->>'direto')::boolean, false) then 'direto'
        else '(sem origem)'
      end as origem
    from etapas e where e.etapa = 'cadastro'
  ),
  funil_coorte as (
    select e.etapa, count(distinct e.usuario_id)::int n
      from etapas e join coorte c on c.id = e.usuario_id group by e.etapa
  ),
  por_origem as (
    select coalesce(o.origem, '(sem origem)') origem, e.etapa, count(distinct e.usuario_id)::int n
      from etapas e join coorte c on c.id = e.usuario_id
      left join origem_de o on o.usuario_id = e.usuario_id
     group by 1, 2
  ),
  dias as (
    select d::date dia from generate_series(v_hoje - (case when v_dias = 0 then 29 else least(v_dias, 90) - 1 end), v_hoje, interval '1 day') d
  )
  select jsonb_build_object(
    'periodo_dias', v_dias,
    'contas', (select count(*)::int from reais),
    'novas', (select count(*)::int from coorte),
    'ativas_7', (select count(distinct s.usuario_id)::int from public.sessoes_estudo s join reais r on r.id = s.usuario_id where s.criado_em > now() - interval '7 days'),
    'ativas_30', (select count(distinct s.usuario_id)::int from public.sessoes_estudo s join reais r on r.id = s.usuario_id where s.criado_em > now() - interval '30 days'),
    'planos', (select coalesce(jsonb_object_agg(tipo_plano, n), '{}'::jsonb) from
                (select coalesce(p.tipo_plano, 'free') tipo_plano, count(*)::int n from public.perfis p join reais r on r.id = p.id group by 1) x),
    'lista_espera', (select count(*)::int from public.lista_espera where email not ilike '%@astral-teste.local'),
    'cadastros_por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia,
         'n', (select count(*)::int from reais r where (r.created_at at time zone 'America/Sao_Paulo')::date = d.dia)) order by d.dia), '[]'::jsonb) from dias d),
    'funil', (select coalesce(jsonb_object_agg(etapa, n), '{}'::jsonb) from funil_coorte),
    'origens', (select coalesce(jsonb_agg(jsonb_build_object('origem', origem, 'etapas', etapas) order by (etapas->>'cadastro')::int desc nulls last, origem), '[]'::jsonb) from
                (select origem, jsonb_object_agg(etapa, n) etapas from por_origem group by origem) x),
    'ia', (select coalesce(jsonb_object_agg(funcao, n), '{}'::jsonb) from
            (select u.funcao, sum(u.unidades)::int n from public.uso_ia u where u.criado_em >= v_desde group by 1) x),
    'ia_hoje', public.uso_de_ia_hoje(),
    'editais_guardados', (select count(*)::int from public.editais_lidos),
    -- 10/10/2026 (3.22): quem disse "Passei!" (contas reais) e quantos depoimentos podem ser mostrados
    'aprovados', (select count(distinct a.usuario_id)::int from public.aprovacoes a join reais r on r.id = a.usuario_id),
    'depoimentos_autorizados', (select count(*)::int from public.aprovacoes a join reais r on r.id = a.usuario_id
                                 where a.pode_publicar and a.depoimento is not null),
    'operacao', public.saude_operacao()
  ) into v_res;
  return v_res;
end;
$function$;
