-- ============================================================================
-- Os dados do aluno: baixar TUDO, e excluir sem deixar rastro (02/10/2026)
-- Auditoria pre-lancamento, LGL-03 + LGL-04 -- roadmap 2.2.
--
-- LGL-03: "Baixar meus dados" (conta.html) prometia "tudo" e entregava 4 das
-- 16 tabelas com dado da pessoa (perfil, progresso, eventos, sessoes). Faltavam
-- conquistas, respostas, caderno, guia, TAF, aceite... A LGPD (art. 18, V)
-- da direito a portabilidade de TODOS os dados.
--   -> meus_dados(): o servidor monta o pacote inteiro. Ele, e nao a pagina,
--      porque so ele enxerga as tabelas que o aluno nao le direto (uso_ia,
--      erros_cliente, auditoria) -- e porque a lista de tabelas mora num
--      lugar so.
--
-- LGL-04: excluir a conta deixava 3 rastros (medido no dev na Fase 2):
--   - a inscricao na lista de espera com o mesmo e-mail (sem ligacao com a conta)
--   - o e-mail na auditoria de troca de plano, PARA SEMPRE
--   - o texto dos erros registrados (sem o id; a Politica diz "ate 12 meses")
--   Decisao dele (pergunta 2, 02/10): "Concordo" -- anonimizar o e-mail.
--   -> gatilho ANTES de apagar a conta em auth.users: pega TAMBEM a exclusao
--      feita pelo painel, nao so a do botao (mesma razao do ao_mudar_plano).
--   -> expurgo diario dos erros com mais de 12 meses (pg_cron).
--
-- 🔴 A ARMADILHA: apagar da lista_espera dispara ao_remover_lead, que GRAVA o
-- e-mail e o nome numa linha nova da auditoria ('lead_removido'). Apagar o
-- lead sem mais nada trocaria um rastro por outro. Por isso o anonimato vem
-- DEPOIS do delete: o gatilho de linha "after delete" roda no fim do proprio
-- delete, entao quando o update chega a linha nova ja existe -- e e limpa junto.
-- O FATO fica (houve troca de plano, de X para Y, em tal data -- prova de
-- cobranca); a PESSOA sai.
-- ============================================================================

-- ── LGL-03: o pacote completo ──────────────────────────────────────────────
create or replace function public.meus_dados()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  conta auth.users%rowtype;
  -- Toda tabela com usuario_id entra aqui. Tabela nova com dado do aluno?
  -- Acrescentar na lista -- o tools/testa-dados-do-aluno.js FALHA se uma
  -- tabela com usuario_id ficar de fora.
  tabelas text[] := array[
    'progresso', 'sessoes_estudo', 'eventos', 'conquistas', 'habilidades_escolhidas',
    'respostas', 'questoes_minhas', 'questoes_servidas', 'recursos_salvos',
    'taf_registros', 'uso_ia', 'consentimentos', 'erros_cliente', 'administradores'];
  t text;
  linhas jsonb;
  pacote jsonb;
begin
  if uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  select * into conta from auth.users where id = uid;

  pacote := jsonb_build_object(
    'exportado_em', now(),
    'origem', 'Astral — astral-psi.vercel.app',
    'conta', jsonb_build_object(
      'id', conta.id, 'email', conta.email, 'criada_em', conta.created_at,
      'ultimo_acesso', conta.last_sign_in_at,
      'forma_de_acesso', coalesce(conta.raw_app_meta_data->>'provider', 'email'),
      'nome', conta.raw_user_meta_data->>'full_name'),
    'perfil', (select to_jsonb(p) from public.perfis p where p.id = uid),
    'lista_de_espera', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
                          from public.lista_espera l where lower(l.email) = lower(conta.email)),
    'historico_de_plano', (select coalesce(jsonb_agg(jsonb_build_object(
                              'evento', a.evento, 'detalhe', a.detalhe, 'em', a.criado_em) order by a.criado_em), '[]'::jsonb)
                             from public.auditoria a where a.alvo_id = uid));

  foreach t in array tabelas loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.usuario_id = $1', t)
      into linhas using uid;
    pacote := pacote || jsonb_build_object(t, linhas);
  end loop;

  return pacote;
end;
$$;

revoke all on function public.meus_dados() from public, anon;
grant execute on function public.meus_dados() to authenticated;

-- ── LGL-04: excluir sem rastro ─────────────────────────────────────────────
create or replace function public.apagar_rastros_da_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. a inscricao na lista de espera com o mesmo e-mail
  if old.email is not null then
    delete from public.lista_espera where lower(email) = lower(old.email);
  end if;

  -- 2. o e-mail e o nome na auditoria -- inclusive a linha 'lead_removido'
  --    que o delete de cima acabou de criar (ver a ARMADILHA no topo)
  update public.auditoria
     set alvo_email = null,
         detalhe    = coalesce(detalhe, '{}'::jsonb) - 'nome'
   where alvo_id = old.id
      or (old.email is not null and lower(alvo_email) = lower(old.email));

  -- 3. erros_cliente.usuario_id e auditoria.alvo_id ja viram null pela FK
  --    (on delete set null); o texto do erro sai no expurgo de 12 meses.
  return old;
end;
$$;

revoke execute on function public.apagar_rastros_da_conta() from public, anon, authenticated;

drop trigger if exists ao_excluir_conta on auth.users;
create trigger ao_excluir_conta
  before delete on auth.users
  for each row
  execute function public.apagar_rastros_da_conta();

-- ── LGL-04: os erros registrados vivem no maximo 12 meses ──────────────────
-- E o que a Politica de Privacidade ja promete; faltava quem cumprisse.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.expurgar_erros_antigos()
returns integer
language sql
security definer
set search_path = public
as $$
  with apagados as (
    delete from public.erros_cliente where criado_em < now() - interval '12 months' returning 1)
  select count(*)::integer from apagados;
$$;

revoke execute on function public.expurgar_erros_antigos() from public, anon, authenticated;

-- Todo dia as 06:15 UTC (03:15 em SP). cron.schedule com nome substitui o
-- agendamento de mesmo nome: rodar a migration de novo nao duplica.
select cron.schedule('astral-expurgo-erros', '15 6 * * *', 'select public.expurgar_erros_antigos()');
