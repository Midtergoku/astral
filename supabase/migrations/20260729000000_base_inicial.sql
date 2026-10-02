-- ============================================================================
-- A BASE QUE NASCEU NO PAINEL -- para o banco subir do zero so com as migrations
--
-- Auditoria pre-lancamento, achado OPS-01 (S0), Lote 1 do roadmap (02/10/2026).
--
-- ── O QUE ESTAVA ERRADO ─────────────────────────────────────────────────────
-- `perfis`, `lista_espera`, a funcao `criar_perfil_usuario` e o gatilho em
-- `auth.users` foram criados PELO PAINEL da Supabase, antes de existir a
-- primeira migration (30/07/2026). Aplicadas num banco vazio, 9 das 43
-- migrations falhavam ("relation public.perfis does not exist") -- e o passo 2
-- da receita de restauracao do backup ("rodar as migrations do git") quebraria
-- no dia em que mais precisasse funcionar.
--
-- ── POR QUE A DATA E ANTERIOR A TODAS ───────────────────────────────────────
-- Tem de rodar ANTES de 20260730120000, que ja conserta a funcao de perfil.
--
-- ── POR QUE TUDO E PROTEGIDO ────────────────────────────────────────────────
-- Na producao tudo isto JA EXISTE, e em versao mais nova (a funcao foi
-- reescrita pela migration seguinte). Entao nada aqui sobrescreve: tabela com
-- `if not exists`, restricao/funcao/gatilho so se faltarem. Na producao esta
-- migration nao muda nada; num banco vazio, cria o minimo para as outras 43
-- rodarem. Politicas, grants e validacoes continuam nas migrations de 30/07.
--
-- ── O QUE FICA DE FORA, DE PROPOSITO ────────────────────────────────────────
-- O gatilho `notificar-novo-cadastro` (lead novo -> e-mail para o dono) leva
-- um SEGREDO no cabecalho, e o repositorio e publico. Numa restauracao ele e
-- recriado com segredo novo por `node tools/recria-webhook-lista.js`.
-- ============================================================================

create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  email       text,
  tipo_plano  text default 'free',
  criado_em   timestamp default now()
);

create table if not exists public.lista_espera (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text not null unique,
  concurso   text not null,
  criado_em  timestamp default now(),
  whatsapp   text
);

alter table public.perfis enable row level security;
alter table public.lista_espera enable row level security;

-- A unica restricao de `perfis` que so existia no painel.
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'perfis_tipo_plano_check'
                   and conrelid = 'public.perfis'::regclass) then
    alter table public.perfis
      add constraint perfis_tipo_plano_check
      check (tipo_plano = any (array['free', 'beta', 'pro']));
  end if;
end $$;

-- A funcao de criar perfil: so se faltar. A versao de verdade (com o nome do
-- Google e o aviso de erro) e a da migration 20260730120000.
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'criar_perfil_usuario') then
    execute $f$
      create function public.criar_perfil_usuario()
      returns trigger language plpgsql security definer set search_path = public as $b$
      begin
        insert into public.perfis (id, nome, email)
        values (new.id, split_part(coalesce(new.email, ''), '@', 1), new.email)
        on conflict (id) do nothing;
        return new;
      end;
      $b$
    $f$;
  end if;
end $$;

-- O gatilho que cria o perfil no cadastro: so se faltar.
do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'ao_criar_usuario' and tgrelid = 'auth.users'::regclass) then
    create trigger ao_criar_usuario
      after insert on auth.users
      for each row execute function public.criar_perfil_usuario();
  end if;
end $$;
