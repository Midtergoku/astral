-- ============================================================================
-- Otimiza as policies de `perfis`.
--
-- Advisor `auth_rls_initplan`: escrever `auth.uid()` solto faz o Postgres
-- reavaliar a funcao UMA VEZ POR LINHA examinada. Envolvendo em `(select ...)`,
-- o planejador trata como constante e avalia uma vez so por consulta.
--
-- Com 6 linhas nao muda nada. Com 10 mil assinantes, muda -- e corrigir agora
-- custa uma migration; corrigir depois custa investigar por que o app ficou
-- lento. Nao altera em nada QUEM pode ver o que.
-- ============================================================================

drop policy if exists "usuario ve apenas seu perfil" on public.perfis;
create policy "usuario ve apenas seu perfil"
  on public.perfis
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "usuario insere seu proprio perfil" on public.perfis;
create policy "usuario insere seu proprio perfil"
  on public.perfis
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "usuario edita apenas seu perfil" on public.perfis;
create policy "usuario edita apenas seu perfil"
  on public.perfis
  for update
  to authenticated
  using      ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
