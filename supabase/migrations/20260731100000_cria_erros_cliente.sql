-- ============================================================================
-- Registro de erros do navegador.
--
-- Ate aqui, uma falha em producao era invisivel: o beta tester via a tela
-- quebrar, ia embora, e ninguem ficava sabendo. Nao existe nenhum servico de
-- monitoramento contratado, e criar conta em servico de terceiro em nome do
-- Lucas nao e coisa que eu possa fazer -- entao o registro fica aqui mesmo,
-- de graca, no banco que ja existe.
--
-- Escrita SO pela edge function `registrar-erro` (service_role). RLS ligada
-- sem policy nenhuma nega qualquer acesso via PostgREST, igual `uso_ia`.
-- ============================================================================

create table if not exists public.erros_cliente (
  id          bigserial primary key,
  -- on delete set null e nao cascade: se a conta for excluida (LGPD), o erro
  -- continua util para diagnostico, so perde o vinculo com a pessoa.
  usuario_id  uuid references auth.users(id) on delete set null,
  mensagem    text        not null,
  pagina      text,
  origem      text,
  pilha       text,
  navegador   text,
  criado_em   timestamptz not null default now(),

  -- Limites de tamanho no BANCO, nao so na funcao: se um dia outra coisa
  -- escrever aqui, o teto continua valendo.
  constraint erros_mensagem_tamanho  check (char_length(mensagem)  between 1 and 2000),
  constraint erros_pagina_tamanho    check (pagina    is null or char_length(pagina)    <= 300),
  constraint erros_origem_tamanho    check (origem    is null or char_length(origem)    <= 300),
  constraint erros_pilha_tamanho     check (pilha     is null or char_length(pilha)     <= 4000),
  constraint erros_navegador_tamanho check (navegador is null or char_length(navegador) <= 400)
);

alter table public.erros_cliente enable row level security;

-- Nenhuma policy de proposito: ninguem le nem escreve via API publica.
-- So a service_role, de dentro da edge function.
revoke all on public.erros_cliente from anon, authenticated;
revoke all on sequence public.erros_cliente_id_seq from anon, authenticated;

-- A consulta natural e "o que quebrou nas ultimas horas", entao o indice e
-- por data decrescente.
create index if not exists erros_cliente_criado_em_idx
  on public.erros_cliente (criado_em desc);

comment on table public.erros_cliente is
  'Erros de JavaScript capturados no navegador. Escrita so pela edge function registrar-erro.';
