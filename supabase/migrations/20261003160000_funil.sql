-- ============================================================================
-- O funil: de onde o aluno veio e ate onde chegou (03/10/2026)
-- Auditoria NEG-01 -- roadmap 2.14. Decisao dele (pergunta 16): "comece agora".
--
-- Antes nao havia como saber qual canal trouxe cada cadastro, nem em que passo
-- as pessoas param. Agora, numa tabela NOSSA -- sem servico de fora, sem custo,
-- sem dado indo para terceiros:
--   cadastro          -> gatilho em auth.users
--   edital            -> gatilho em progresso (edital passou a existir)
--   rotina            -> gatilho em progresso (rotina passou a existir)
--   primeira_sessao   -> gatilho em sessoes_estudo
--   origem            -> o navegador anota na 1a visita (utm_*, o site que
--                        trouxe a pessoa) e manda UMA vez, pelo
--                        registrar_origem(), na primeira entrada na conta.
-- Uma linha por pessoa e etapa (unique): conta a PRIMEIRA vez, nao repete.
-- Ninguem le nem grava direto: so os gatilhos e o registrar_origem().
-- Para ler: node tools/funil.js (chave de servico).
-- ============================================================================

create table if not exists public.funil (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  etapa       text not null check (etapa in ('cadastro', 'edital', 'rotina', 'primeira_sessao')),
  criado_em   timestamptz not null default now(),
  origem      jsonb check (origem is null or (jsonb_typeof(origem) = 'object' and char_length(origem::text) <= 600)),
  unique (usuario_id, etapa)
);
alter table public.funil enable row level security;
revoke all on public.funil from anon, authenticated;

create or replace function public.funil_marcar(p_uid uuid, p_etapa text, p_quando timestamptz default now())
returns void language sql security definer set search_path = public as $$
  insert into public.funil (usuario_id, etapa, criado_em) values (p_uid, p_etapa, coalesce(p_quando, now()))
  on conflict (usuario_id, etapa) do nothing;
$$;
revoke execute on function public.funil_marcar(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.funil_ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.funil_marcar(new.id, 'cadastro', new.created_at); return new; end; $$;
revoke execute on function public.funil_ao_criar_usuario() from public, anon, authenticated;
drop trigger if exists funil_cadastro on auth.users;
create trigger funil_cadastro after insert on auth.users
  for each row execute function public.funil_ao_criar_usuario();

create or replace function public.funil_do_progresso()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.edital is not null and (tg_op = 'INSERT' or old.edital is null) then
    perform public.funil_marcar(new.usuario_id, 'edital');
  end if;
  if new.rotina is not null and (tg_op = 'INSERT' or old.rotina is null) then
    perform public.funil_marcar(new.usuario_id, 'rotina');
  end if;
  return new;
end; $$;
revoke execute on function public.funil_do_progresso() from public, anon, authenticated;
drop trigger if exists funil_progresso on public.progresso;
create trigger funil_progresso after insert or update on public.progresso
  for each row execute function public.funil_do_progresso();

create or replace function public.funil_da_sessao()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.funil_marcar(new.usuario_id, 'primeira_sessao', new.criado_em); return new; end; $$;
revoke execute on function public.funil_da_sessao() from public, anon, authenticated;
drop trigger if exists funil_sessao on public.sessoes_estudo;
create trigger funil_sessao after insert on public.sessoes_estudo
  for each row execute function public.funil_da_sessao();

-- A origem, uma vez so: so as chaves conhecidas, texto curto. A 2a chamada nao
-- muda nada (vale o PRIMEIRO contato).
create or replace function public.registrar_origem(p_origem jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  limpa jsonb := '{}'::jsonb;
  k text;
begin
  if auth.uid() is null or p_origem is null or jsonb_typeof(p_origem) <> 'object' then return false; end if;
  foreach k in array array['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'pagina', 'em'] loop
    if jsonb_typeof(p_origem->k) = 'string' and char_length(p_origem->>k) between 1 and 80 then
      limpa := limpa || jsonb_build_object(k, p_origem->>k);
    end if;
  end loop;
  if limpa = '{}'::jsonb then limpa := '{"direto": "true"}'::jsonb; end if;
  perform public.funil_marcar(auth.uid(), 'cadastro');
  update public.funil set origem = limpa
   where usuario_id = auth.uid() and etapa = 'cadastro' and origem is null;
  return found;
end; $$;
revoke all on function public.registrar_origem(jsonb) from public, anon;
grant execute on function public.registrar_origem(jsonb) to authenticated;

-- As contas que ja existiam: o funil comeca preenchido com o que o banco sabe.
-- A origem delas e desconhecida -- marcada assim, para nao ser trocada depois
-- pelo "primeiro contato" de hoje, que nao foi o primeiro.
insert into public.funil (usuario_id, etapa, criado_em, origem)
  select id, 'cadastro', created_at, '{"antes_do_funil": "true"}'::jsonb from auth.users
  on conflict (usuario_id, etapa) do nothing;
insert into public.funil (usuario_id, etapa, criado_em)
  select usuario_id, 'edital', coalesce(atualizado_em, criado_em, now()) from public.progresso where edital is not null
  on conflict (usuario_id, etapa) do nothing;
insert into public.funil (usuario_id, etapa, criado_em)
  select usuario_id, 'rotina', coalesce((rotina->>'respondidoEm')::timestamptz, atualizado_em, now()) from public.progresso where rotina is not null
  on conflict (usuario_id, etapa) do nothing;
insert into public.funil (usuario_id, etapa, criado_em)
  select usuario_id, 'primeira_sessao', min(criado_em) from public.sessoes_estudo group by usuario_id
  on conflict (usuario_id, etapa) do nothing;

-- "Baixar meus dados" (LGL-03) leva o funil tambem.
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
    'questoes_reportadas',
    -- 03/10/2026: as etapas do funil e a origem do cadastro (NEG-01)
    'funil'];
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
