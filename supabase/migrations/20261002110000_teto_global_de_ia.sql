-- ============================================================================
-- O TETO GLOBAL DE IA POR DIA -- e o uso de hoje, visivel
--
-- Auditoria pre-lancamento, achados EDI-01 + SEG-06 (S1), item 1.4 do Lote 1
-- do roadmap (02/10/2026) -- pre-requisito de por credito na Anthropic.
--
-- ── O QUE ESTAVA ERRADO ─────────────────────────────────────────────────────
-- Os limites eram so POR CONTA. Quem criasse contas (o captcha e a unica
-- barreira) multiplicava o gasto. E a leitura de edital que FALHAVA depois de a
-- IA responder (um PDF que nao e edital: duas chamadas pagas) nao contava em
-- nada -- dava para repetir sem fim.
--
-- ── O QUE PASSA A HAVER ─────────────────────────────────────────────────────
--   teto_global_de_ia()  quantas UNIDADES de cada funcao de IA o Astral inteiro
--                        aceita por dia (fuso de Sao Paulo), somando todas as
--                        contas. Lido pelo _shared/comum.ts antes de cada
--                        chamada a Anthropic. Um lugar so para mudar.
--   uso_de_ia_hoje()     o usado e o teto de hoje, para o checa-saude mostrar.
--
-- 💰 OS NUMEROS (decisao do Lucas -- custo; ver historico/valores.md):
--   processar-edital  10/dia   ~R$ 0,85 a 7,50 cada  -> no maximo ~R$ 75/dia
--   buscar-recursos   60/dia   ~R$ 0,68 cada (ate ~R$ 1,90 no pior caso)
--   gerar-questoes   100/dia   em questoes; hoje DESLIGADA (FUNCOES_DESLIGADAS)
-- Edital e guia ja guardados (cache) nao contam: nao custam.
-- ============================================================================

create or replace function public.teto_global_de_ia()
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'processar-edital', 10,
    'buscar-recursos',  60,
    'gerar-questoes',  100
  );
$$;

create or replace function public.uso_de_ia_hoje()
returns jsonb language sql stable security definer set search_path = public as $$
  with hoje as (
    select (date_trunc('day', now() at time zone 'America/Sao_Paulo')
            at time zone 'America/Sao_Paulo') as desde
  )
  select jsonb_object_agg(f.funcao, jsonb_build_object(
           'usado', coalesce((select sum(u.unidades) from public.uso_ia u, hoje
                               where u.funcao = f.funcao and u.criado_em >= hoje.desde), 0),
           'teto', (public.teto_global_de_ia() ->> f.funcao)::integer))
  from (select jsonb_object_keys(public.teto_global_de_ia()) as funcao) f;
$$;

revoke all on function public.teto_global_de_ia() from public, anon, authenticated;
revoke all on function public.uso_de_ia_hoje() from public, anon, authenticated;
grant execute on function public.teto_global_de_ia() to service_role;
grant execute on function public.uso_de_ia_hoje() to service_role;
