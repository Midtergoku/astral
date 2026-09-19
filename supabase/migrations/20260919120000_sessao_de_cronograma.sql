-- ── SESSAO VINDA DO CRONOGRAMA ──────────────────────────────────────────────
--
-- O PROBLEMA, apontado pelo Lucas em 19/09/2026:
--   "seria bom ter algum mecanismo desse contador ativar quando a pessoa
--    clicasse em estudar. Pq o cronometro do site e apenas para ajudar a
--    contabilizar o tempo estudado."
--
-- Ele esta certo, e medi: das CINCO acoes que dao XP hoje, so UMA grava
-- sessao. O cronometro grava; marcar a sessao do cronograma como feita
-- (dashboard.html:1287, que e o caminho principal de quem usa o Astral) nao
-- grava nada. Sobe o XP e pronto.
--
-- POR QUE ISSO IMPORTA AGORA: o R1 (a ficha) e o R0 (o servidor calcular o XP)
-- derivam tudo de `sessoes_estudo`. Se marcar o cronograma nao deixa registro,
-- quem estuda pelo cronograma teria ficha ZERADA -- e o conserto do XP
-- APAGARIA o progresso dessas pessoas. Seria uma regressao grave disfarcada
-- de melhoria.
--
-- O QUE MUDA: `modo` passa a aceitar 'cronograma'.
--
-- POR QUE UM MODO NOVO, e nao reusar 'livre': a diferenca entre eles nao e
-- cosmetica, e a espinha do anti-fraude.
--
--   'livre' / 'pomodoro'  tempo MEDIDO -- o relogio correu de verdade
--   'cronograma'          tempo DECLARADO -- a pessoa disse que estudou
--
-- Sao graus de confianca diferentes, e o calculo do XP no servidor vai poder
-- trata-los diferente. Jogar os dois no mesmo balde jogaria fora justamente a
-- informacao que distingue estudo medido de estudo afirmado.
--
-- REVERSIVEL: e so afrouxar um CHECK. Para desfazer, o CHECK antigo volta --
-- desde que nenhuma linha 'cronograma' exista, o que a propria restricao
-- garantiria ao ser recriada.

alter table public.sessoes_estudo
  drop constraint if exists sessoes_estudo_modo_check;

alter table public.sessoes_estudo
  add constraint sessoes_estudo_modo_check
  check (modo in ('livre', 'pomodoro', 'cronograma'));

comment on column public.sessoes_estudo.modo is
  'Como o tempo foi apurado. livre/pomodoro = MEDIDO pelo cronometro; '
  'cronograma = DECLARADO ao marcar a sessao do dia como feita. '
  'A distincao existe para o calculo de XP no servidor poder confiar '
  'diferente em cada um -- ver historico/roadmap-rpg.md, R0 e R1.';
