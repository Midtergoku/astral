-- ============================================================================
-- Fecha o INSERT anonimo direto na `lista_espera`.
--
-- Era o ultimo critico aberto da auditoria (8.2, ALTO 5): qualquer pessoa
-- conseguia inserir linhas direto no PostgREST, sem passar pelo formulario.
-- Como existe um webhook que dispara e-mail a cada linha, um script entupia a
-- caixa do Lucas e queimava a cota gratuita do Resend.
--
-- A partir de agora o unico caminho e a edge function `entrar-lista-espera`,
-- que confere o token do hCaptcha contra api.hcaptcha.com e insere com
-- service_role -- que NAO passa por RLS e por isso continua funcionando.
--
-- ⚠️ ORDEM: esta migration so pode ser aplicada DEPOIS de o cadastro.html novo
-- estar publicado em producao. Aplicar antes derruba a captacao de leads em
-- silencio -- e a mesma inversao que derrubou o login em 31/07 (ver 0.1).
-- Conferido antes de aplicar: producao servindo a chamada a edge function.
-- ============================================================================

drop policy if exists "qualquer um entra na lista de espera" on public.lista_espera;

-- Tira o privilegio tambem, nao so a policy. Sao duas barreiras independentes:
-- sem o grant, nem uma policy nova por engano reabre o buraco.
revoke insert on public.lista_espera from anon;

-- `authenticated` nunca precisou: quem se cadastra na lista de espera, por
-- definicao, ainda nao tem conta.
revoke insert on public.lista_espera from authenticated;

comment on table public.lista_espera is
  'Leads do beta. Escrita SO pela edge function entrar-lista-espera (service_role), que verifica o captcha antes.';
