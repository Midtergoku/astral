-- ============================================================================
-- EDITAL E GUIA GUARDADOS -- a trava de creditos (pedido dele, 29/09/2026)
--
-- "Precisamos pensar em uma trava para a pessoa nao comer nossos creditos
-- todos porque quer trocar o edital." Decisoes dele, no mesmo dia:
--   - edital compartilhado: SIM, mas a experiencia tem de parecer feita na hora
--     para a pessoa (isso e a tela; aqui so se guarda);
--   - guia compartilhado: SIM, mas "certifique que seja do MESMO edital" --
--     por isso a chave e a impressao digital do PDF (SHA-256), nao o nome do
--     concurso: dois PDFs diferentes do mesmo concurso (um retificado, outro
--     do Diario Oficial) nunca se misturam;
--   - troca de edital: gratis 1, Pro 2, em 30 dias (isso e o servidor).
--
-- As duas tabelas sao FECHADAS: RLS ligada, grant nenhum. So as funcoes do
-- servidor (chave de servico) leem e escrevem. O navegador nunca ve o cache --
-- ve so o resultado, como se tivesse acabado de ser feito.
-- ============================================================================

create table if not exists public.editais_lidos (
  hash        text primary key check (hash ~ '^[0-9a-f]{64}$'),
  resultado   jsonb not null,
  paginas     integer,
  usos        integer not null default 1,
  criado_em   timestamptz not null default now(),
  ultimo_uso  timestamptz not null default now()
);

create table if not exists public.guias_por_edital (
  edital_hash text not null references public.editais_lidos(hash) on delete cascade,
  materia     text not null check (length(btrim(materia)) between 1 and 120),
  dados       jsonb not null,
  criado_em   timestamptz not null default now(),
  primary key (edital_hash, materia)
);

alter table public.editais_lidos    enable row level security;
alter table public.guias_por_edital enable row level security;
revoke all on public.editais_lidos    from anon, authenticated;
revoke all on public.guias_por_edital from anon, authenticated;

comment on table public.editais_lidos is
  'Resultado da leitura de cada edital, pela impressao digital (SHA-256) do PDF. '
  'O 2o aluno que sobe o MESMO arquivo recebe sem nova chamada de IA. Fechada: so o servidor.';
comment on table public.guias_por_edital is
  'Guia de estudo (professores e materiais) por materia de UM edital. So e gravado '
  'com materia e concurso vindos do proprio edital guardado -- nunca do que o navegador mandou.';
