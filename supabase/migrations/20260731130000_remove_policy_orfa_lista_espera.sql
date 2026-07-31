-- ============================================================================
-- Remove de verdade a policy de INSERT publico da `lista_espera`.
--
-- ERRO MEU, encontrado na varredura de 31/07/2026: a migration ..120000 fez
--     drop policy if exists "qualquer um entra na lista de espera"
-- e o nome real era "cadastro publico na lista de espera". Como usei
-- `if exists`, o Postgres apenas avisou "does not exist, skipping" e seguiu --
-- nao houve erro, e eu dei o trabalho por feito.
--
-- Consequencia real: NENHUMA, porque o `revoke insert` da mesma migration
-- funcionou, e sem privilegio a RLS nem chega a ser consultada. As duas
-- barreiras existiam justamente para isso, e uma segurou.
--
-- Mas deixar a policy e perigoso no medio prazo: ela DIZ que anon pode
-- inserir. No dia em que alguem (inclusive eu) devolver o grant por qualquer
-- motivo, o buraco reabre em silencio.
--
-- Licao registrada em 0.1: nunca escrever `drop policy` com nome de memoria.
-- Consultar `pg_policies` antes.
-- ============================================================================

drop policy if exists "cadastro publico na lista de espera" on public.lista_espera;

-- Reforca o revoke, caso alguma migration futura reintroduza o privilegio.
revoke insert on public.lista_espera from anon, authenticated;
