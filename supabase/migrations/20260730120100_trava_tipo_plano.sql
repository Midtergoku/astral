-- ============================================================================
-- Impede o usuario de mudar o proprio tipo_plano.
--
-- Defeito: a policy de UPDATE em perfis declara USING (auth.uid() = id) e nao
-- declara WITH CHECK. Sem WITH CHECK explicito o Postgres reaproveita a
-- expressao do USING -- e o usuario continua sendo dono da propria linha
-- mesmo depois de trocar o plano. Ou seja, uma linha no console do navegador:
--
--   await supabase.from('perfis').update({ tipo_plano: 'pro' }).eq('id', user.id)
--
-- ... e o plano pago sai de graca. Bloqueador absoluto da etapa de pagamento.
--
-- Alem disso, "select relacl from pg_class" mostrou que anon e authenticated
-- tinham privilegio TOTAL (arwdDxtm) nas duas tabelas: INSERT, SELECT, UPDATE
-- e DELETE. A unica barreira era a RLS. Se uma policy for escrita errada um
-- dia, nao existe segunda linha de defesa.
--
-- A protecao do tipo_plano vai no nivel de PRIVILEGIO DE COLUNA, nao em
-- trigger: o PostgREST respeita GRANT por coluna, entao a requisicao e
-- recusada antes de o UPDATE ser executado.
--
-- service_role NAO e tocado -- a Table Editor do painel continua promovendo
-- usuario para 'beta' ou 'pro' normalmente.
-- ============================================================================

revoke all on public.perfis from anon;
revoke all on public.perfis from authenticated;

-- O app so precisa ler o proprio perfil e, no maximo, editar o nome.
-- Nao ha nenhuma escrita em perfis no frontend hoje; o INSERT e feito pela
-- trigger, que roda como SECURITY DEFINER e nao depende destes grants.
grant select           on public.perfis to authenticated;
grant update (nome)    on public.perfis to authenticated;

-- WITH CHECK explicito, para nao depender do fallback silencioso do USING.
drop policy if exists "usuario edita apenas seu perfil" on public.perfis;
create policy "usuario edita apenas seu perfil"
  on public.perfis
  for update
  to authenticated
  using      (auth.uid() = id)
  with check (auth.uid() = id);
