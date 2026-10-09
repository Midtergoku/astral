-- ============================================================================
-- O PAINEL DE NEGOCIO (09/10/2026 -- auditoria NEG-04, roadmap 3.17)
--
-- "Cadastros por dia, origem, conversao, faturamento: nao ha tela. Com 7
-- contas, eu consigo responder por SQL; com 500, nao." Os numeros ja existiam
-- (funil do 2.14, uso_ia, sessoes, saude_operacao do 3.15) -- so o Claude via,
-- pelo terminal (tools/funil.js). Agora o dono ve numa pagina (painel.html).
--
-- painel_de_negocio(p_dias)  um retrato so, para o periodo pedido (1 a 365
--                            dias; 0 = desde o comeco):
--   contas reais (as @astral-teste.local, que os testes criam, ficam de fora),
--   novas no periodo, ativas em 7 e 30 dias, planos, lista de espera,
--   cadastros por dia, o funil (cadastro -> edital -> rotina -> 1a sessao) de
--   quem se cadastrou no periodo, o mesmo por ORIGEM, uso de IA, editais
--   guardados e a saude da operacao (alertas do vigia).
--
-- 🔒 Fechada como o importador: confere sou_administrador() por auth.uid()
-- (nunca por parametro). So NUMEROS: nenhum nome, e-mail ou id de aluno sai
-- daqui. A origem (utm_source/ref) vem da URL que trouxe a pessoa -- e dado
-- nao confiavel: a pagina escapa (esc) antes de mostrar.
-- Faturamento: nao existe pagamento ainda (Mercado Pago, Lote 5) -- a pagina diz isso.
-- ============================================================================

create or replace function public.painel_de_negocio(p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
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
    'operacao', public.saude_operacao()
  ) into v_res;
  return v_res;
end;
$$;
revoke all on function public.painel_de_negocio(integer) from public, anon;
grant execute on function public.painel_de_negocio(integer) to authenticated, service_role;
