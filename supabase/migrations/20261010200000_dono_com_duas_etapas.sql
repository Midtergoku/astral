-- O DONO SO E DONO COM O CODIGO DO APLICATIVO (10/10/2026, roadmap 4.4 -- MFA)
--
-- sou_administrador() e a porta de TODA tela e funcao do dono: painel do negocio, importador de questoes,
-- publicar, acervo, explicacao/gabarito, certo-errado, passei, estado-e-cargo (medido em 10/10: nenhuma
-- funcao do public consulta a tabela administradores sem passar por aqui; as edge functions nao checam dono).
--
-- Regra nova: quem tem as duas etapas ATIVAS (fator TOTP verificado) so e reconhecido como dono se ESTA
-- sessao confirmou o codigo (aal2 no token). Quem roubar a senha do dono entra como aluno comum.
--
-- Por que "OU nao tem fator verificado": a ordem de duas pontas (CLAUDE.md, erro do login de 03/08).
-- A migration entra ANTES de ele ativar; se exigisse aal2 de cara, o dono perderia o painel ate ativar,
-- e ativar depois que o servidor ja exige e o mesmo que nao poder ativar. Assim: sem fator, nada muda;
-- com fator, passa a exigir. O checa-saude avisa enquanto o dono estiver sem fator.
--
-- Desligar o codigo tambem exige aal2 (regra do proprio Supabase para apagar fator verificado), entao o
-- ladrao com a senha nao consegue tirar a trava.

create or replace function public.sou_administrador()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (select 1 from public.administradores where usuario_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (
         select 1 from auth.mfa_factors f
          where f.user_id = auth.uid() and f.status = 'verified'
       )
     );
$function$;
