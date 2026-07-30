-- ============================================================================
-- Tira a funcao de trigger da API REST publica.
--
-- Advisores: anon_security_definer_function_executable e
-- authenticated_security_definer_function_executable.
--
-- criar_perfil_usuario() e SECURITY DEFINER e estava chamavel por qualquer um
-- via POST /rest/v1/rpc/criar_perfil_usuario. Na pratica a chamada direta erra,
-- porque e funcao de trigger e depende de NEW, que nao existe fora do contexto
-- de trigger -- mas nao ha motivo nenhum para ela estar exposta.
--
-- Revogar EXECUTE nao afeta a trigger: o disparo de trigger nao consulta
-- privilegio de execucao do usuario que originou o comando.
-- ============================================================================

revoke execute on function public.criar_perfil_usuario() from public;
revoke execute on function public.criar_perfil_usuario() from anon;
revoke execute on function public.criar_perfil_usuario() from authenticated;
