-- ============================================================================
-- AS QUESTOES DE CADA UM -- o aluno traz a prova que o acervo nao tem.
--
-- Pedido dele em 22/09/2026, e a frase que define o recorte:
--   "caso nao conseguimos colocar la e o aluno que esteja estudando pense,
--    poxa, queria ter algo aqui para eu poder estudar, ele mesmo consegue
--    adicionar, mas isso SO PARA ELE. Eu quero que seja uma mecanica
--    INDIVIDUAL."
--
-- ── A DIFERENCA PARA `questoes`, e ela e toda a razao desta tabela ──────────
-- `questoes` e o acervo publico: so o administrador escreve, e todo mundo le
-- atraves de `sortear_questoes`, com o portao free/pro no meio.
--
-- Aqui e o contrario em tudo: **cada pessoa escreve as suas**, e **ninguem
-- alcanca as dos outros**. Nem o acervo publico as vê, nem elas entram no
-- acervo publico. Sao dois mundos que nunca se tocam, e e assim de proposito:
-- o que a pessoa sobe pode ser material com dono, prova de cursinho, PDF que
-- ela comprou. Publicar isso por engano seria distribuir o que nao e nosso.
--
-- ⚠️ POR QUE RLS DE VERDADE AQUI, e nao "so funcao" como no acervo publico:
-- no acervo a escrita e de UM dono e a leitura passa por um portao de plano.
-- Aqui cada usuario escreve e le as PROPRIAS linhas, o tempo todo -- e policy
-- por `auth.uid()` e exatamente a ferramenta para isso. A funcao viraria um
-- intermediario sem trabalho nenhum a fazer.
-- ============================================================================

create table if not exists public.questoes_minhas (
  id            bigint generated always as identity primary key,
  usuario_id    uuid     not null references auth.users(id) on delete cascade,

  -- De onde veio, do jeito que a pessoa quiser chamar. Sem lista fechada:
  -- e o material DELA, e obrigar a escolher de um menu so atrapalharia.
  origem        text     not null check (length(btrim(origem)) between 1 and 80),
  materia       text              check (materia is null or length(btrim(materia)) <= 60),
  assunto       text              check (assunto is null or length(btrim(assunto)) <= 60),

  enunciado     text     not null check (length(btrim(enunciado)) >= 10),
  alternativas  jsonb    not null check (jsonb_typeof(alternativas) = 'object'),
  -- 🔴 NULO E PERMITIDO AQUI, e no acervo publico nao e. Muita prova de banca
  -- civil vem sem gabarito no mesmo PDF; no acervo isso seria inaceitavel
  -- (questao sem resposta certa nao serve a ninguem), mas aqui a pessoa pode
  -- responder e marcar sozinha qual era a certa. E o material dela.
  gabarito      text              check (gabarito is null or gabarito in ('a','b','c','d','e')),

  criado_em     timestamptz not null default now()
);

create index if not exists questoes_minhas_do_dono
  on public.questoes_minhas (usuario_id, materia, assunto);

-- ── Teto por pessoa ────────────────────────────────────────────────────────
-- 🔴 O plano do Supabase e o FREE: 500 MB para o banco inteiro. A 470 bytes
-- por questao, 2.000 questoes por pessoa sao ~1 MB. Com teto, 100 pessoas
-- cabem em 100 MB e o acervo publico continua tendo casa. Sem teto, uma
-- pessoa subindo PDFs a noite inteira derruba o banco de todo mundo --
-- e isso nao seria culpa dela, seria minha por nao ter posto limite.
create or replace function public.limite_questoes_minhas()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tem int;
begin
  select count(*) into v_tem from public.questoes_minhas where usuario_id = new.usuario_id;
  if v_tem >= 2000 then
    raise exception 'voce ja tem 2000 questoes suas -- apague algumas antes de subir mais'
      using errcode = '54000';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limite_questoes_minhas on public.questoes_minhas;
create trigger trg_limite_questoes_minhas
  before insert on public.questoes_minhas
  for each row execute function public.limite_questoes_minhas();

-- ── RLS: cada um so alcanca as proprias ────────────────────────────────────
alter table public.questoes_minhas enable row level security;

revoke all on public.questoes_minhas from anon, authenticated;
-- Sem `usuario_id` na lista de update: a pessoa NAO pode transferir uma
-- questao para outra conta. Mesma ideia do grant por coluna do tipo_plano.
grant select, insert, delete on public.questoes_minhas to authenticated;
grant update (origem, materia, assunto, enunciado, alternativas, gabarito)
  on public.questoes_minhas to authenticated;
grant usage, select on sequence public.questoes_minhas_id_seq to authenticated;

drop policy if exists "le as proprias questoes" on public.questoes_minhas;
create policy "le as proprias questoes" on public.questoes_minhas
  for select to authenticated using (usuario_id = (select auth.uid()));

-- 🔴 WITH CHECK EXPLICITO. Sem ele o Postgres reaproveita o USING, e ja houve
-- um caso assim neste projeto: a policy de update em `perfis` sem WITH CHECK
-- deixava o usuario trocar o proprio plano (migration de 30/07).
drop policy if exists "cria as proprias questoes" on public.questoes_minhas;
create policy "cria as proprias questoes" on public.questoes_minhas
  for insert to authenticated with check (usuario_id = (select auth.uid()));

drop policy if exists "edita as proprias questoes" on public.questoes_minhas;
create policy "edita as proprias questoes" on public.questoes_minhas
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists "apaga as proprias questoes" on public.questoes_minhas;
create policy "apaga as proprias questoes" on public.questoes_minhas
  for delete to authenticated using (usuario_id = (select auth.uid()));

comment on table public.questoes_minhas is
  'As questoes que cada aluno sobe para si. NUNCA se misturam com o acervo '
  'publico `questoes`: o material pode ter dono, e publica-lo por engano '
  'seria distribuir o que nao e nosso. Ver roadmap Q5.';
