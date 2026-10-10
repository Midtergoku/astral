-- ============================================================================
-- OS LINKS DO GUIA, CONFERIDOS TODA SEMANA (10/10/2026 -- auditoria CE-08, roadmap 3.24)
--
-- Decisao dele (P8): "sim" -- alem de conferir na hora em que o guia e gerado
-- (_shared/links.ts, 30/09), conferir DEPOIS, para pegar o link que morre com o
-- tempo (video tirado do ar, canal apagado).
--
-- A especificacao falava em "API do YouTube (chave do Google)". NAO precisa: o
-- conferidor de 30/09 usa o oEmbed e o feed publico do YouTube, sem chave, e foi
-- medido no servidor (12/12). Sem chave nova para criar ou guardar.
--
--   revisado_em            nas duas tabelas de guia: quando a ultima revisao passou
--   chamar_revisao_links() o despertador semanal chama a funcao revisar-links com o
--                          MESMO segredo do vigia (cofre: astral_vigia_url e
--                          astral_vigia_segredo -- o endereco troca /vigia por
--                          /revisar-links). Cofre vazio: nao chama nada.
-- So sai do guia o link MORTO COM CERTEZA (404, dominio inexistente); duvida fica.
-- ============================================================================

alter table public.guias_por_edital add column if not exists revisado_em timestamptz;
alter table public.recursos_salvos  add column if not exists revisado_em timestamptz;

create or replace function public.chamar_revisao_links()
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_segredo text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'astral_vigia_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'astral_vigia_segredo';
  if v_url is null or v_segredo is null then return null; end if;
  return net.http_post(url := regexp_replace(v_url, '/vigia$', '/revisar-links'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-astral-vigia', v_segredo),
    timeout_milliseconds := 120000);
end;
$$;
revoke all on function public.chamar_revisao_links() from public, anon, authenticated;
grant execute on function public.chamar_revisao_links() to service_role;

-- Toda segunda, 06h de Sao Paulo (09h UTC) -- longe do vigia (aos :23) e do backup (21h).
select cron.schedule('astral-revisar-links', '0 9 * * 1', 'select public.chamar_revisao_links()');
