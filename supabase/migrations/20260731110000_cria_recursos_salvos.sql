-- ============================================================================
-- Recursos (professores e materiais) salvos de forma PERMANENTE.
--
-- Antes: cache no localStorage com validade de 24h. Toda vez que a validade
-- vencia, a mesma materia era buscada de novo na IA -- e cada busca custa
-- ~R$ 0,68 (busca web cobrada a parte, US$ 10 por mil). Uma pessoa estudando
-- 6 materias por 3 meses gerava ~540 buscas: ~R$ 367 de uma coisa que quase
-- nao muda.
--
-- Agora (decisao do Lucas em 31/07/2026): UMA busca por materia, e o resultado
-- fica fixo. O argumento dele nao foi so custo -- foi de PRODUTO: "isso a gente
-- vai organizar mais ainda o conteudo dele, o estudo dele, ele nao vai ter que
-- ficar procurando outros professores sempre". Uma lista estavel de professores
-- e melhor para quem estuda do que uma lista que muda toda semana.
--
-- Rebuscar so acontece quando a pessoa pede explicitamente, ou quando troca de
-- edital (o `concurso` guardado deixa de bater).
-- ============================================================================

create table if not exists public.recursos_salvos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,

  materia     text not null check (char_length(materia) between 1 and 160),
  -- Nome do concurso no momento da busca. Se a pessoa trocar de edital, o
  -- valor deixa de bater e a tela sabe que precisa buscar de novo.
  concurso    text not null check (char_length(concurso) between 1 and 200),

  dados       jsonb not null,

  criado_em   timestamptz not null default now(),

  -- Uma linha por materia por pessoa. O upsert do frontend depende disto.
  constraint recursos_salvos_unico unique (usuario_id, materia)
);

create index if not exists recursos_salvos_por_usuario
  on public.recursos_salvos (usuario_id);

-- ── Privilegios: mesmo padrao das demais tabelas do usuario ─────────────────
revoke all on public.recursos_salvos from anon, authenticated;
grant select, insert, update, delete on public.recursos_salvos to authenticated;
grant usage, select on sequence public.recursos_salvos_id_seq to authenticated;

alter table public.recursos_salvos enable row level security;

-- `(select auth.uid())` e nao `auth.uid()`: sem o select, o Postgres reavalia
-- a funcao linha a linha (advisor `auth_rls_initplan`).
create policy "dono le seus recursos"    on public.recursos_salvos
  for select to authenticated using      ((select auth.uid()) = usuario_id);
create policy "dono cria seus recursos"  on public.recursos_salvos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "dono edita seus recursos" on public.recursos_salvos
  for update to authenticated using      ((select auth.uid()) = usuario_id)
                               with check ((select auth.uid()) = usuario_id);
create policy "dono apaga seus recursos" on public.recursos_salvos
  for delete to authenticated using      ((select auth.uid()) = usuario_id);

comment on table public.recursos_salvos is
  'Professores e materiais indicados pela IA. Uma busca por materia, resultado permanente.';
