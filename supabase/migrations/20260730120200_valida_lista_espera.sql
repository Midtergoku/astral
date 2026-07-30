-- ============================================================================
-- Reduz a superficie de abuso da lista de espera.
--
-- Defeito: a policy de INSERT e "WITH CHECK (true)" para anon -- o advisor do
-- Supabase sinaliza como rls_policy_always_true. Sem captcha e sem rate limit,
-- e com um webhook disparando um e-mail via Resend a cada linha inserida, um
-- script simples entope a caixa de entrada do dono e queima a cota gratuita.
--
-- O rate limit de verdade nao cabe no banco: vai para uma edge function no
-- Bloco B2. Aqui fica o que o Postgres garante sozinho -- limite de tamanho,
-- formato de e-mail e privilegio minimo.
--
-- Os 2 registros existentes foram conferidos antes: passam em todas as
-- restricoes abaixo.
-- ============================================================================

-- anon precisa APENAS inserir. Nao precisa ler -- sem isso, uma policy de
-- SELECT criada por engano no futuro exporia e-mail e whatsapp de todo mundo.
revoke all    on public.lista_espera from anon;
revoke all    on public.lista_espera from authenticated;
grant  insert on public.lista_espera to   anon, authenticated;

alter table public.lista_espera
  add constraint lista_espera_nome_tamanho
    check (char_length(nome) between 2 and 120),
  add constraint lista_espera_email_formato
    check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
           and char_length(email) <= 200),
  add constraint lista_espera_concurso_tamanho
    check (concurso is null or char_length(concurso) <= 80),
  add constraint lista_espera_whatsapp_tamanho
    check (whatsapp is null or char_length(whatsapp) <= 30);

-- A policy repete as validacoes de tamanho de proposito: a CHECK constraint
-- devolve erro 400 generico, enquanto a policy recusa antes, e as duas juntas
-- cobrem o caso de alguem futuramente afrouxar uma das duas.
drop policy if exists "permitir cadastros publicos" on public.lista_espera;
create policy "cadastro publico na lista de espera"
  on public.lista_espera
  for insert
  to anon, authenticated
  with check (
    char_length(nome) between 2 and 120
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(email) <= 200
    and (concurso is null or char_length(concurso) <= 80)
    and (whatsapp is null or char_length(whatsapp) <= 30)
  );
