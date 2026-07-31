-- ============================================================================
-- Log de auditoria de eventos criticos.
--
-- O que o registro de erros (erros_cliente) NAO cobre: o que aconteceu quando
-- NADA quebrou. Se amanha uma conta virar `pro` sozinha, ou um perfil sumir,
-- hoje nao ha como saber quem fez, quando, nem a partir de onde.
--
-- Isso ja doeu uma vez: quando a `lista_espera` apareceu vazia em 30/07, eu
-- nao tinha como provar que nao tinha sido eu. Foi o Lucas quem lembrou que
-- tinha apagado. Com lead de verdade entrando, "sumiu e ninguem sabe por que"
-- deixa de ser aceitavel.
--
-- Escopo de proposito ESTREITO -- so o que muda dinheiro, acesso ou existencia:
--   plano_alterado    quem virou beta/pro, e a partir de que valor
--   perfil_criado     conta nova
--   conta_excluida    LGPD, direito ao esquecimento
--   lead_removido     alguem sumiu da lista de espera
--
-- Nao registra navegacao, login comum nem uso do app: isso seria vigilancia do
-- usuario, nao auditoria de seguranca, e ainda criaria um passivo de LGPD.
-- ============================================================================

create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,

  evento      text        not null check (char_length(evento) between 1 and 60),
  -- Quem sofreu a acao. `set null` e nao `cascade`: se a conta for excluida, o
  -- registro DA EXCLUSAO precisa sobreviver -- e justamente o que se audita.
  alvo_id     uuid        references auth.users(id) on delete set null,
  alvo_email  text        check (alvo_email is null or char_length(alvo_email) <= 200),

  -- Quem fez. Nulo quando foi o proprio sistema (trigger) ou o painel.
  autor       text        check (autor is null or char_length(autor) <= 120),

  -- Antes/depois, para plano_alterado. jsonb para nao engessar novos eventos.
  detalhe     jsonb,

  criado_em   timestamptz not null default now()
);

create index if not exists auditoria_criado_em_idx on public.auditoria (criado_em desc);
create index if not exists auditoria_evento_idx    on public.auditoria (evento, criado_em desc);

-- Mesma tecnica de uso_ia e erros_cliente: RLS ligada SEM policy nenhuma nega
-- todo acesso via PostgREST. So a service_role enxerga. O usuario nao deve
-- poder ler nem apagar o log do que fizeram com a conta dele -- caso contrario
-- o log nao serve para auditar nada.
alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon, authenticated;
revoke all on sequence public.auditoria_id_seq from anon, authenticated;

comment on table public.auditoria is
  'Eventos criticos: mudanca de plano, criacao de perfil, exclusao de conta, remocao de lead.';

-- ── Registro automatico de mudanca de plano ─────────────────────────────────
-- Trigger e nao codigo de aplicacao de proposito: pega TAMBEM o que for feito
-- pela Table Editor do painel ou por SQL na mao -- que e exatamente como o
-- Lucas promove beta tester hoje (13.6). Auditoria que so cobre o caminho
-- feliz nao serve.
create or replace function public.registrar_mudanca_de_plano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_plano is distinct from old.tipo_plano then
    insert into public.auditoria (evento, alvo_id, alvo_email, autor, detalhe)
    values (
      'plano_alterado',
      new.id,
      new.email,
      -- current_user diz o papel do banco (postgres, service_role,
      -- authenticated). Nao identifica pessoa, mas separa "veio do painel" de
      -- "veio do app", que ja e a distincao que importa.
      current_user,
      jsonb_build_object('de', old.tipo_plano, 'para', new.tipo_plano)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.registrar_mudanca_de_plano() from public, anon, authenticated;

drop trigger if exists ao_mudar_plano on public.perfis;
create trigger ao_mudar_plano
  after update on public.perfis
  for each row
  execute function public.registrar_mudanca_de_plano();

-- ── Registro de remocao de lead ─────────────────────────────────────────────
create or replace function public.registrar_remocao_de_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auditoria (evento, alvo_email, autor, detalhe)
  values ('lead_removido', old.email, current_user,
          jsonb_build_object('nome', old.nome, 'concurso', old.concurso));
  return old;
end;
$$;

revoke execute on function public.registrar_remocao_de_lead() from public, anon, authenticated;

drop trigger if exists ao_remover_lead on public.lista_espera;
create trigger ao_remover_lead
  after delete on public.lista_espera
  for each row
  execute function public.registrar_remocao_de_lead();
