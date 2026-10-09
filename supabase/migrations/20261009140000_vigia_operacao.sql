-- ============================================================================
-- O VIGIA DA OPERACAO (09/10/2026 -- auditoria OPS-03, roadmap 3.15)
--
-- O vigia do GitHub (vigia.yml) so pergunta "o site esta no ar?". Ninguem
-- avisava de: IA perto do teto do dia, banco perto do limite de 500 MB do
-- plano gratis, funcoes do servidor falhando. As falhas das funcoes iam so para
-- o log do Supabase, que ninguem le.
--
--   falhas_servidor    uma linha por falha de funcao (5xx, IA fora, teto do dia).
--                      SEM usuario_id: nao e dado pessoal (fica fora do
--                      "baixar meus dados" de proposito -- nao ha o que baixar).
--   vigia_alertas      quando cada alerta foi mandado por e-mail (no maximo
--                      um por dia por tipo -- alerta que grita toda hora
--                      ensina a ignorar).
--   saude_operacao()   os numeros e os ALERTAS, num lugar so: o e-mail (funcao
--                      vigia) e o checa-saude leem daqui.
--   chamar_vigia()     o despertador de hora em hora (pg_cron) chama a funcao
--                      vigia. O endereco e o segredo moram no COFRE (vault),
--                      gravados por tools/liga-vigia.js -- o repositorio e
--                      publico, entao nenhum dos dois esta aqui. Sem o cofre
--                      preenchido (banco recriado do zero), nao chama nada.
--
-- Tudo fechado: so service_role. Nenhuma policy, nenhum grant a anon/authenticated.
-- 💰 Custo: R$ 0 (pg_cron e pg_net ja instalados; Resend gratis ate 3.000/mes,
-- e o vigia manda no maximo 1 e-mail por tipo de alerta por dia).
-- ============================================================================

create table if not exists public.falhas_servidor (
  id         bigint generated always as identity primary key,
  funcao     text        not null check (char_length(funcao) between 1 and 60),
  status     integer     not null,
  tipo       text        not null check (tipo in ('erro', 'ia_indisponivel', 'ia_taxa', 'teto', 'falha')),
  criado_em  timestamptz not null default now()
);
create index if not exists falhas_servidor_por_data on public.falhas_servidor (criado_em desc);
alter table public.falhas_servidor enable row level security;
revoke all on public.falhas_servidor from public, anon, authenticated;
grant select, insert, delete on public.falhas_servidor to service_role;

create table if not exists public.vigia_alertas (
  tipo        text primary key check (char_length(tipo) between 1 and 60),
  enviado_em  timestamptz not null default now()
);
alter table public.vigia_alertas enable row level security;
revoke all on public.vigia_alertas from public, anon, authenticated;
grant select, insert, update, delete on public.vigia_alertas to service_role;

-- Os limites. Mudar aqui muda o e-mail e o checa-saude juntos.
--   IA: 80% do teto do dia (teto_global_de_ia)
--   banco: 400 MB dos 500 do plano gratis · arquivos: 800 MB de 1 GB
--   funcoes: 5 falhas em 24 h, ou qualquer bater no teto do dia
--   navegador: 50 erros em 24 h (o checa-saude ja lista os de perto)
create or replace function public.saude_operacao()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ia jsonb := public.uso_de_ia_hoje();
  v_banco numeric := round(pg_database_size(current_database()) / 1048576.0, 1);
  v_arquivos numeric := 0;
  v_falhas jsonb;
  v_total integer;
  v_teto integer;
  v_nav integer;
  v_alertas jsonb := '[]'::jsonb;
  f record;
begin
  begin
    select round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) into v_arquivos from storage.objects;
  exception when others then v_arquivos := null;     -- sem storage: nao e alerta
  end;
  select coalesce(jsonb_object_agg(funcao, n), '{}'::jsonb), coalesce(sum(n), 0)::int
    into v_falhas, v_total
    from (select funcao, count(*)::int n from public.falhas_servidor
           where criado_em > now() - interval '24 hours' group by funcao) x;
  select count(*)::int into v_teto from public.falhas_servidor
   where tipo = 'teto' and criado_em > now() - interval '24 hours';
  select count(*)::int into v_nav from public.erros_cliente where criado_em > now() - interval '24 hours';

  for f in select key, value from jsonb_each(coalesce(v_ia, '{}'::jsonb)) loop
    if (f.value->>'teto') is not null and (f.value->>'teto')::numeric > 0
       and (f.value->>'usado')::numeric >= 0.8 * (f.value->>'teto')::numeric then
      v_alertas := v_alertas || jsonb_build_object('tipo', 'ia:' || f.key,
        'texto', format('IA: %s usou %s de %s hoje (teto do dia).', f.key, f.value->>'usado', f.value->>'teto'));
    end if;
  end loop;
  if v_banco >= 400 then
    v_alertas := v_alertas || jsonb_build_object('tipo', 'banco',
      'texto', format('Banco com %s MB (o plano grátis vai até 500 MB).', v_banco));
  end if;
  if v_arquivos is not null and v_arquivos >= 800 then
    v_alertas := v_alertas || jsonb_build_object('tipo', 'arquivos',
      'texto', format('Arquivos com %s MB (o plano grátis vai até 1 GB).', v_arquivos));
  end if;
  if v_teto > 0 then
    v_alertas := v_alertas || jsonb_build_object('tipo', 'teto',
      'texto', format('%s pedido(s) recusado(s) nas últimas 24 h porque a IA bateu no teto do dia.', v_teto));
  end if;
  if v_total >= 5 then
    v_alertas := v_alertas || jsonb_build_object('tipo', 'funcoes',
      'texto', format('%s falhas de funções do servidor nas últimas 24 h: %s.', v_total, v_falhas::text));
  end if;
  if v_nav >= 50 then
    v_alertas := v_alertas || jsonb_build_object('tipo', 'navegador',
      'texto', format('%s erros nos navegadores dos alunos nas últimas 24 h.', v_nav));
  end if;

  return jsonb_build_object('ia', v_ia, 'banco_mb', v_banco, 'arquivos_mb', v_arquivos,
    'falhas_24h', v_falhas, 'erros_navegador_24h', v_nav, 'alertas', v_alertas);
end;
$$;
revoke all on function public.saude_operacao() from public, anon, authenticated;
grant execute on function public.saude_operacao() to service_role;

-- O despertador chama a funcao vigia. p_teste: manda um e-mail de teste
-- (para provar que o canal funciona), mesmo sem alerta.
create or replace function public.chamar_vigia(p_teste boolean default false)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_segredo text;
begin
  -- a faxina: falha de mais de 90 dias nao ajuda a diagnosticar nada
  delete from public.falhas_servidor where criado_em < now() - interval '90 days';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'astral_vigia_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'astral_vigia_segredo';
  if v_url is null or v_segredo is null then return null; end if;     -- cofre vazio: vigia desligado
  return net.http_post(url := v_url,
    body := jsonb_build_object('teste', p_teste),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-astral-vigia', v_segredo),
    timeout_milliseconds := 20000);
end;
$$;
revoke all on function public.chamar_vigia(boolean) from public, anon, authenticated;
grant execute on function public.chamar_vigia(boolean) to service_role;

-- De hora em hora, aos 23 minutos (o vigia do GitHub roda aos 17).
select cron.schedule('astral-vigia', '23 * * * *', 'select public.chamar_vigia()');
