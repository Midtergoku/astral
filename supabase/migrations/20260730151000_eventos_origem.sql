-- ============================================================================
-- Acrescenta `origem` aos eventos.
--
-- O calendario importa a data da prova do edital automaticamente e usa esse
-- campo para nao duplicar a importacao a cada carregamento. Sem ele, eu teria
-- de deduzir pela categoria 'prova' -- o que falharia no momento em que o
-- usuario criasse um evento de prova proprio, e a importacao pararia de
-- acontecer sem ninguem entender por que.
-- ============================================================================

alter table public.eventos
  add column if not exists origem text
    check (origem is null or char_length(origem) <= 40);

comment on column public.eventos.origem is
  'De onde o evento veio. "edital_prova" marca a data importada do edital; nulo = criado pelo usuario.';

-- Uma unica importacao automatica por usuario.
create unique index if not exists eventos_uma_origem_por_usuario
  on public.eventos (usuario_id, origem)
  where origem is not null;
