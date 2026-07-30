-- ============================================================================
-- Remove o registro criado durante o teste de ponta a ponta das migrations
-- anteriores.
--
-- Depois de apertar os privilegios da lista_espera era obrigatorio provar que
-- o formulario da landing continuava funcionando -- revogar um grant a mais e
-- derrubar a captacao de leads em silencio. O teste bateu na API REST real
-- como anon e devolveu HTTP 201, entao a linha existe e precisa sair.
--
-- Observacao: esse INSERT disparou o webhook do Resend, entao chegou um
-- e-mail de "novo cadastro" na caixa do Lucas. Falso positivo, era o teste.
-- ============================================================================

delete from public.lista_espera
where email = 'teste-blindagem-b1@astral.local';
