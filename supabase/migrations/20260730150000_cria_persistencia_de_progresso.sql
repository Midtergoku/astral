-- ============================================================================
-- Persistencia do progresso de estudo.
--
-- Ate aqui, TODO o estado do usuario vivia apenas no localStorage do navegador:
-- xp, streak, horas, materias, cronograma, badges, eventos e historico do
-- cronometro. Consequencia pratica: estudar no computador e abrir no celular
-- mostrava a tela zerada, como se fosse conta nova. Limpar o cache apagava
-- tudo, sem aviso. Nenhum produto por assinatura sobrevive a isso.
--
-- Modelagem: numeros escalares viram COLUNA (dao consulta -- analytics e o
-- gate de plano da Etapa 2), e as colecoes que o app sempre le inteiras ficam
-- em JSONB. Ja eventos e sessoes de cronometro sao manipulados item a item,
-- entao sao tabelas de verdade.
-- ============================================================================

-- ── Progresso: uma linha por usuario ────────────────────────────────────────
create table if not exists public.progresso (
  usuario_id       uuid primary key references auth.users(id) on delete cascade,

  xp               integer     not null default 0 check (xp >= 0),
  streak           integer     not null default 0 check (streak >= 0),
  horas            numeric(8,2) not null default 0 check (horas >= 0),

  -- Colecoes sempre lidas inteiras. O formato e o mesmo que ja estava no
  -- localStorage, para a migracao dos dados existentes ser direta.
  edital           jsonb,
  materias         jsonb       not null default '[]'::jsonb,
  cronograma_hoje  jsonb       not null default '[]'::jsonb,
  badges           jsonb       not null default '[]'::jsonb,

  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),

  constraint progresso_materias_e_lista        check (jsonb_typeof(materias) = 'array'),
  constraint progresso_cronograma_e_lista      check (jsonb_typeof(cronograma_hoje) = 'array'),
  constraint progresso_badges_e_lista          check (jsonb_typeof(badges) = 'array')
);

-- ── Eventos do calendario ───────────────────────────────────────────────────
create table if not exists public.eventos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 200),
  data        date not null,
  categoria   text not null default 'personalizado' check (char_length(categoria) <= 40),
  obs         text check (obs is null or char_length(obs) <= 1000),
  criado_em   timestamptz not null default now()
);
create index if not exists eventos_por_usuario on public.eventos (usuario_id, data);

-- ── Sessoes do cronometro ───────────────────────────────────────────────────
create table if not exists public.sessoes_estudo (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  materia     text check (materia is null or char_length(materia) <= 160),
  segundos    integer not null check (segundos between 0 and 86400),
  xp          integer not null default 0 check (xp >= 0),
  modo        text not null default 'livre' check (modo in ('livre','pomodoro')),
  criado_em   timestamptz not null default now()
);
create index if not exists sessoes_por_usuario on public.sessoes_estudo (usuario_id, criado_em desc);

-- ── Marca de atualizacao ────────────────────────────────────────────────────
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists progresso_atualizado_em on public.progresso;
create trigger progresso_atualizado_em
  before update on public.progresso
  for each row execute function public.tocar_atualizado_em();

-- Funcao de trigger nao tem por que estar exposta na API REST.
revoke execute on function public.tocar_atualizado_em() from public, anon, authenticated;

-- ── Privilegios: mesmo criterio do Bloco B1 ─────────────────────────────────
-- anon nao toca em nada. authenticated recebe so o necessario, e a RLS
-- restringe as proprias linhas. Duas barreiras, nao uma.
revoke all on public.progresso      from anon, authenticated;
revoke all on public.eventos        from anon, authenticated;
revoke all on public.sessoes_estudo from anon, authenticated;

grant select, insert, update         on public.progresso      to authenticated;
grant select, insert, update, delete on public.eventos        to authenticated;
grant usage, select on sequence public.eventos_id_seq         to authenticated;
grant select, insert, delete         on public.sessoes_estudo to authenticated;
grant usage, select on sequence public.sessoes_estudo_id_seq  to authenticated;

alter table public.progresso      enable row level security;
alter table public.eventos        enable row level security;
alter table public.sessoes_estudo enable row level security;

-- `(select auth.uid())` e nao `auth.uid()`: sem o select, o Postgres reavalia
-- a funcao uma vez por linha examinada. Ver advisor auth_rls_initplan.
create policy "dono le seu progresso"    on public.progresso for select to authenticated using      ((select auth.uid()) = usuario_id);
create policy "dono cria seu progresso"  on public.progresso for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "dono edita seu progresso" on public.progresso for update to authenticated using      ((select auth.uid()) = usuario_id)
                                                                                        with check ((select auth.uid()) = usuario_id);

create policy "dono le seus eventos"     on public.eventos for select to authenticated using      ((select auth.uid()) = usuario_id);
create policy "dono cria seus eventos"   on public.eventos for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "dono edita seus eventos"  on public.eventos for update to authenticated using      ((select auth.uid()) = usuario_id)
                                                                                     with check ((select auth.uid()) = usuario_id);
create policy "dono apaga seus eventos"  on public.eventos for delete to authenticated using      ((select auth.uid()) = usuario_id);

create policy "dono le suas sessoes"     on public.sessoes_estudo for select to authenticated using      ((select auth.uid()) = usuario_id);
create policy "dono cria suas sessoes"   on public.sessoes_estudo for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "dono apaga suas sessoes"  on public.sessoes_estudo for delete to authenticated using      ((select auth.uid()) = usuario_id);

comment on table public.progresso is
  'Estado de estudo do usuario. Substitui a chave astral_dados_<id> do localStorage.';
