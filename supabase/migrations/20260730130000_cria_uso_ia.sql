-- ============================================================================
-- Registro de uso das funcoes de IA, para quota por usuario e por plano.
--
-- Hoje nao existe nenhum registro de quem chamou o que. Sem isso nao ha quota,
-- nao ha como investigar abuso e nao ha como saber quanto cada plano custa --
-- informacao de que a Etapa 2 (precificacao) vai depender.
--
-- A tabela e escrita e lida APENAS pelas edge functions, que usam a
-- service_role e ignoram RLS. anon e authenticated nao recebem privilegio
-- nenhum: o usuario nao pode ler, e muito menos apagar, o proprio consumo.
-- ============================================================================

create table if not exists public.uso_ia (
  id          bigint generated always as identity primary key,
  usuario_id  uuid        not null references auth.users(id) on delete cascade,
  funcao      text        not null,
  criado_em   timestamptz not null default now(),

  constraint uso_ia_funcao_conhecida
    check (funcao in ('processar-edital', 'gerar-questoes', 'buscar-recursos'))
);

-- A consulta de quota e sempre "quantas vezes ESTE usuario chamou ESTA funcao
-- desde tal momento" -- o indice cobre exatamente isso.
create index if not exists uso_ia_por_usuario_funcao_data
  on public.uso_ia (usuario_id, funcao, criado_em desc);

alter table public.uso_ia enable row level security;

-- Sem policy nenhuma de proposito: com RLS ligada e nenhuma policy, todo
-- acesso via PostgREST e negado. Só a service_role, que ignora RLS, enxerga.
revoke all on public.uso_ia from anon;
revoke all on public.uso_ia from authenticated;

comment on table public.uso_ia is
  'Log de chamadas as funcoes de IA. Base da quota por plano e da apuracao de custo.';
