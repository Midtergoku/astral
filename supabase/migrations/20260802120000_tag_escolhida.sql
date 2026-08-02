-- ============================================================================
-- A TAG QUE O USUARIO ESCOLHEU VESTIR
-- ============================================================================
-- Decisao do Lucas em 02/08/2026:
--   "acumular tudo e eu poder escolher realmente o que vai aparecer. Ele clica
--    em tags, abre e aparecem as que ele possui, e clica naquela que quiser
--    colocar pra ficar de frente."
--
-- Ate agora o assets/js/divisa.js escolhia SOZINHO -- pegava a materia de
-- maior dominio acima de 70%. Funciona, mas o usuario nao manda em nada e nem
-- descobre que tem uma colecao.
--
-- POR QUE UMA COLUNA E NAO UM CAMPO DENTRO DE `badges`:
-- `badges` e um array de conquistas. Enfiar a tag escolhida ali misturaria
-- duas coisas diferentes (o que voce GANHOU x o que voce VESTE) e obrigaria
-- todo leitor de badges a filtrar. Uma coluna e explicita e nao ambigua.
--
-- NULO E VALIDO E E O PADRAO: significa "deixa o Astral escolher por mim",
-- que e o comportamento de hoje. Ninguem precisa escolher para o site
-- funcionar -- escolher e um poder a mais, nao uma obrigacao.
-- ============================================================================

alter table public.progresso
  add column if not exists tag_escolhida text;

comment on column public.progresso.tag_escolhida is
  'Nome da tag que o usuario escolheu exibir na divisa. NULO = escolha automatica (a materia de maior dominio). Ver .claude/skills/astral-gamificacao.';

-- Limite de tamanho: o nome de tag mais longo do catalogo tem 22 caracteres
-- ("Administrador de Elite"). 60 da folga larga e barra texto arbitrario --
-- o valor chega do navegador, e o navegador nao e confiavel (regra 3 do
-- CLAUDE.md: validar no front E no back).
alter table public.progresso
  drop constraint if exists progresso_tag_escolhida_tamanho;

alter table public.progresso
  add constraint progresso_tag_escolhida_tamanho
  check (tag_escolhida is null or char_length(tag_escolhida) between 1 and 60);

-- A tabela `progresso` ja tem RLS com policy por usuario_id (migration
-- ..150000). Coluna nova herda a policy da tabela: nao ha o que abrir aqui, e
-- abrir seria justamente o erro. Confirmado antes de escrever esta migration.
