-- ============================================================================
-- A tabela de erros deixa de ser uma porta aberta (03/10/2026)
-- Auditoria SEG-01 -- roadmap 3.5.
--
-- registrar-erro aceita envio SEM login, de proposito (metade dos erros que
-- importam acontece na tela de login). O unico freio era um teto GLOBAL de 500
-- por hora: um script enchia o banco em dias (o plano gratis tem 500 MB, e
-- banco cheio fica so leitura -- ninguem mais salva progresso) e, de quebra,
-- esgotava o teto e calava o registro dos alunos de verdade.
--
-- Medido antes de mexer (producao): 152 erros em toda a historia, pior dia 58,
-- maior erro 357 caracteres. Os limites abaixo tem folga larga para isso.
--
-- O LIMITE E POR ORIGEM. A origem e o IP real (cf-connecting-ip): medido no dev
-- com uma funcao temporaria, X-Forwarded-For e X-Real-IP falsos sao descartados
-- pelo caminho, e CF-Connecting-IP falso e recusado pelo proprio Cloudflare.
-- O IP NAO e guardado: a funcao guarda um codigo embaralhado (HMAC) dele, e a
-- linha de contagem some em 2 dias.
-- ============================================================================

create table if not exists public.erros_cliente_limite (
  chave   text        not null,
  janela  timestamptz not null,
  n       integer     not null default 0,
  primary key (chave, janela)
);
alter table public.erros_cliente_limite enable row level security;
revoke all on public.erros_cliente_limite from public, anon, authenticated;
-- Sem policy de proposito: so a chave de servico (a funcao) le e escreve.

-- Conta e responde se ainda cabe. Recebe TODOS os limites de uma vez:
-- [{"chave": "...", "teto": 15, "por": "hora" | "dia"}]. Atomico por chave
-- (on conflict): duas chamadas ao mesmo tempo nao passam juntas do teto.
create or replace function public.contar_erro_cliente(p_limites jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  l jsonb;
  v_n integer;
  v_cabe boolean := true;
begin
  for l in select * from jsonb_array_elements(coalesce(p_limites, '[]'::jsonb)) loop
    insert into public.erros_cliente_limite as e (chave, janela, n)
    values (l->>'chave',
            date_trunc(case when l->>'por' = 'dia' then 'day' else 'hour' end, now()),
            1)
    on conflict (chave, janela) do update set n = e.n + 1
    returning n into v_n;
    if v_n > (l->>'teto')::integer then v_cabe := false; end if;
  end loop;
  return v_cabe;
end;
$$;
revoke all on function public.contar_erro_cliente(jsonb) from public, anon, authenticated;
grant execute on function public.contar_erro_cliente(jsonb) to service_role;

-- O expurgo diario (LGL-04) passa a cuidar tambem do resto:
--   - erros com mais de 12 meses (como antes)
--   - contagens com mais de 2 dias (o codigo do IP nao fica guardado)
--   - TETO DE TAMANHO: no maximo 20.000 erros; passando, os mais velhos saem.
--     Pior caso medido: ~2,5 KB por erro -> ~50 MB, folga contra os 500 MB.
create or replace function public.expurgar_erros_antigos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_velhos integer;
  v_excesso integer;
begin
  delete from public.erros_cliente where criado_em < now() - interval '12 months';
  get diagnostics v_velhos = row_count;

  delete from public.erros_cliente_limite where janela < now() - interval '2 days';

  delete from public.erros_cliente
   where id in (select id from public.erros_cliente order by criado_em desc offset 20000);
  get diagnostics v_excesso = row_count;

  return v_velhos + v_excesso;
end;
$$;
revoke execute on function public.expurgar_erros_antigos() from public, anon, authenticated;
