-- ═══════════════════════════════════════════════════════════════════════════
-- 🔴 FECHA O XP VALIDADO -- buraco que EU abri hoje, e que o teste pegou
--
-- ── O QUE ACONTECEU ────────────────────────────────────────────────────────
-- Em 20/09/2026 acrescentei a coluna `xp_validado` em `public.progresso` para
-- guardar o XP que o SERVIDOR calcula. A decisao dele foi explicita:
-- "o servidor vai gravar, nao quero ninguem alterando isso a nao ser nos".
--
-- So que `progresso` ja tinha, desde 30/07, um grant de tabela inteira:
--
--     grant select, insert, update on public.progresso to authenticated;
--
-- Grant de tabela vale para TODA coluna -- inclusive as que ainda nao existiam
-- quando ele foi escrito. Entao a coluna nova nasceu escrevivel pelo usuario, e
-- o teste confirmou: um PATCH gravou 999999 e o banco aceitou.
--
-- 🔴 A LICAO, e ela vale para toda coluna futura: acrescentar coluna a uma
-- tabela com grant amplo NAO e operacao neutra. A permissao e herdada em
-- silencio, e o campo novo nasce com a permissao do mais permissivo que ja
-- existia ali.
--
-- ── O CONSERTO: PERMISSAO POR COLUNA ──────────────────────────────────────
-- O Postgres sabe dar `update` em colunas especificas. Entao: tira o `update`
-- da tabela e devolve coluna por coluna, deixando `xp_validado` de fora.
--
-- ⚠️ E preciso listar TODAS as outras colunas de escrita, senao `salvar_progresso`
-- para de funcionar -- ela e `security invoker`, ou seja, roda com a permissao
-- de quem chamou. Perder uma coluna aqui quebraria o salvamento de progresso,
-- que e a coisa que ele mais pediu para eu nao quebrar.
--
-- `criado_em` e `atualizado_em` ficam de fora de proposito: quem escreve as
-- duas e o default e o gatilho `progresso_atualizado_em`, que roda no servidor.
-- `usuario_id` fica de fora porque e a chave -- mudar dono de linha nao e
-- operacao que o dono da linha deva poder fazer.

revoke update on public.progresso from authenticated;

grant update (
  xp,
  streak,
  horas,
  edital,
  materias,
  cronograma_hoje,
  badges,
  tag_escolhida
) on public.progresso to authenticated;

-- `insert` continua valendo para a tabela: a linha nasce pelo upsert de
-- `salvar_progresso`, e `xp_validado` nasce com o default 0. Inserir com um
-- valor alto seria um caminho de fraude, entao ele tambem e fechado por
-- coluna.
revoke insert on public.progresso from authenticated;

grant insert (
  usuario_id,
  xp,
  streak,
  horas,
  edital,
  materias,
  cronograma_hoje,
  badges,
  tag_escolhida
) on public.progresso to authenticated;

comment on column public.progresso.xp_validado is
  'XP calculado pelo SERVIDOR a partir de sessoes_estudo. O usuario NAO tem '
  'grant de insert nem de update nesta coluna -- a unica porta e '
  'sincronizar_conquistas(), que e security definer. Ver a migration '
  '20260920200000 para o buraco que isto fechou.';
