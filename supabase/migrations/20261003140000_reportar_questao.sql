-- ============================================================================
-- "Reportar erro nesta questao" (03/10/2026)
-- Auditoria BAN-02 -- roadmap 2.11.
--
-- Os detectores da auditoria tiraram 300 questoes do ar (simbolo perdido,
-- alternativas de outra questao, pedaco de outra colado, figura que nao
-- existe). Mas ha defeito que nenhum detector pega -- gabarito errado com
-- enunciado perfeito, por exemplo. Quem acha e quem estuda. Antes nao havia
-- nenhum jeito de avisar (procurei "reportar", "erro na questao", "avisar").
--
-- Uma linha por pessoa e questao (unique): reportar de novo nao duplica.
-- RLS: a pessoa grava e le so os PROPRIOS relatos; ninguem le os dos outros.
-- Quem le todos e o administrador, pela chave de servico (checa-saude).
-- ============================================================================

create table if not exists public.questoes_reportadas (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  questao_id  bigint not null references public.questoes(id) on delete cascade,
  motivo      text not null check (motivo in ('gabarito', 'enunciado', 'figura', 'outro')),
  detalhe     text check (detalhe is null or char_length(detalhe) <= 500),
  criado_em   timestamptz not null default now(),
  resolvido_em timestamptz,
  unique (usuario_id, questao_id)
);
create index if not exists questoes_reportadas_abertas on public.questoes_reportadas (criado_em) where resolvido_em is null;

alter table public.questoes_reportadas enable row level security;
revoke all on public.questoes_reportadas from anon, authenticated;
grant select, insert (questao_id, motivo, detalhe) on public.questoes_reportadas to authenticated;

drop policy if exists "dono le seus relatos" on public.questoes_reportadas;
create policy "dono le seus relatos" on public.questoes_reportadas
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "dono reporta" on public.questoes_reportadas;
create policy "dono reporta" on public.questoes_reportadas
  for insert to authenticated with check ((select auth.uid()) = usuario_id);

-- O pacote "Baixar meus dados" (LGL-03) leva os relatos tambem.
CREATE OR REPLACE FUNCTION public.meus_dados()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid   uuid := auth.uid();
  conta auth.users%rowtype;
  -- Toda tabela com usuario_id entra aqui. Tabela nova com dado do aluno?
  -- Acrescentar na lista -- o tools/testa-dados-do-aluno.js FALHA se uma
  -- tabela com usuario_id ficar de fora.
  tabelas text[] := array[
    'progresso', 'sessoes_estudo', 'eventos', 'conquistas', 'habilidades_escolhidas',
    'respostas', 'questoes_minhas', 'questoes_servidas', 'recursos_salvos',
    'taf_registros', 'uso_ia', 'consentimentos', 'erros_cliente', 'administradores',
    -- 03/10/2026: os erros que a pessoa reportou nas questoes (BAN-02)
    'questoes_reportadas'];
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
$function$;
