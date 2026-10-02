-- ============================================================================
-- AS REGRAS DE CADA PLANO NUM LUGAR SO -- `pode(recurso)`
--
-- Pedido dele em 01/10/2026: "o primeiro passo e a funcao unica (...) para cada
-- trava nao virar um if espalhado, custa zero reais e leva uma sessao. Pode
-- fazer." (item 1 da ordem sugerida em historico/gap-analysis-planos.md).
--
-- ── O QUE HAVIA ─────────────────────────────────────────────────────────────
-- Os numeros de cada plano moravam em tres copias:
--   - _shared/comum.ts: LIMITE_DIARIO (IA por dia) e EDITAIS_EM_30_DIAS;
--   - sortear_questoes: `v_free`, o 10 e o "- 4 anos" escritos no meio do SQL;
--   - minha-quota: `completo: plano === "pro" || plano === "beta"`.
-- Mudar um limite exigia lembrar dos tres lugares.
--
-- ── O QUE PASSA A HAVER ─────────────────────────────────────────────────────
-- `regras_do_plano(plano)` e a UNICA tabela de regras. Todo o resto pergunta
-- a ela: o servidor das funcoes de IA (comum.ts), o sorteio de questoes, a
-- tela de quota e o navegador (`meu_plano()`).
--
-- ⚠️ NENHUM LIMITE MUDOU. Os numeros abaixo sao exatamente os de 01/10/2026.
-- Decisoes dele que esta tabela registra (gap-analysis-planos.md, sec. 5):
--   caderno de erros e rebalanceamento: para TODOS; Pro: 1o edital + 2 trocas
--   em 30 dias; beta: parado, mas mantido igual ao Pro (promessa publica).
--
-- Para acrescentar uma trava nova: uma chave aqui + `pode('chave')` no lugar
-- que trava. Nunca um `if plano === ...` solto.
-- ============================================================================

create or replace function public.regras_do_plano(p_plano text)
returns jsonb language sql immutable set search_path = public as $$
  select case coalesce(p_plano, 'free')
    when 'pro' then jsonb_build_object(
      'plano', 'pro', 'completo', true,
      'limites', jsonb_build_object(
        'processar-edital', 10, 'gerar-questoes', 60, 'buscar-recursos', 60,
        'editais_30_dias', 3,
        'questoes_por_dia', null, 'questoes_anos_minimo', 0),
      'recursos', jsonb_build_object(
        'acervo_completo', true, 'caderno_de_erros', true,
        'rebalanceamento', true, 'guia_completo', true))
    -- beta e promessa publica de acesso pro VITALICIO: anda sempre junto do pro.
    -- Parado desde 01/10/2026 (ninguem novo entra), mas nunca rebaixado.
    when 'beta' then jsonb_build_object(
      'plano', 'beta', 'completo', true,
      'limites', jsonb_build_object(
        'processar-edital', 10, 'gerar-questoes', 60, 'buscar-recursos', 30,
        'editais_30_dias', 3,
        'questoes_por_dia', null, 'questoes_anos_minimo', 0),
      'recursos', jsonb_build_object(
        'acervo_completo', true, 'caderno_de_erros', true,
        'rebalanceamento', true, 'guia_completo', true))
    -- free e tambem o que vale para qualquer valor desconhecido: na duvida,
    -- o MENOR acesso, nunca o maior.
    else jsonb_build_object(
      'plano', 'free', 'completo', false,
      'limites', jsonb_build_object(
        'processar-edital', 2, 'gerar-questoes', 10, 'buscar-recursos', 12,
        'editais_30_dias', 2,
        'questoes_por_dia', 10, 'questoes_anos_minimo', 4),
      'recursos', jsonb_build_object(
        'acervo_completo', false, 'caderno_de_erros', true,
        'rebalanceamento', true, 'guia_completo', true))
  end;
$$;

-- O plano de quem esta logado, com as regras dele. Le `perfis` pela RLS do
-- proprio usuario (security invoker): ninguem consulta o plano de outro.
create or replace function public.meu_plano()
returns jsonb language sql stable security invoker set search_path = public as $$
  select public.regras_do_plano(
    (select tipo_plano from public.perfis where id = auth.uid()));
$$;

-- "Este usuario pode usar este recurso?" Recurso desconhecido = NAO.
create or replace function public.pode(p_recurso text)
returns boolean language sql stable security invoker set search_path = public as $$
  select coalesce((public.meu_plano() -> 'recursos' ->> p_recurso)::boolean, false);
$$;

-- O limite numerico de um recurso. NULL = sem limite.
create or replace function public.limite_do_plano(p_plano text, p_recurso text)
returns integer language sql immutable set search_path = public as $$
  select (public.regras_do_plano(p_plano) -> 'limites' ->> p_recurso)::integer;
$$;

revoke all on function public.regras_do_plano(text) from public, anon;
revoke all on function public.meu_plano() from public, anon;
revoke all on function public.pode(text) from public, anon;
revoke all on function public.limite_do_plano(text, text) from public, anon;
grant execute on function public.regras_do_plano(text) to authenticated, service_role;
grant execute on function public.meu_plano() to authenticated;
grant execute on function public.pode(text) to authenticated;
grant execute on function public.limite_do_plano(text, text) to authenticated, service_role;

-- ── O sorteio de questoes passa a perguntar as regras ──────────────────────
-- Mesma assinatura e mesmo resultado da versao de 27/09 (sortear_devolve_tipo);
-- trocados so: os numeros (10 por dia, 4 anos) vem de regras_do_plano, e o
-- texto do fim da amostra ganhou os acentos (auditoria BAN-03).
create or replace function public.sortear_questoes(
  p_materia text     default null,
  p_assunto text     default null,
  p_banca   text     default null,
  p_ano     int      default null,
  p_limite  int      default 10,
  p_prova   text     default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_plano     text;
  v_por_dia   int;
  v_anos      int;
  v_amostra   boolean;
  v_ano_teto  int;
  v_hoje      int;
  v_restam    int;
  v_pedir     int;
  v_ids       bigint[];
  v_saida     jsonb;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;

  select coalesce(tipo_plano, 'free') into v_plano from public.perfis where id = v_uid;
  v_plano   := coalesce(v_plano, 'free');
  v_por_dia := public.limite_do_plano(v_plano, 'questoes_por_dia');
  v_anos    := coalesce(public.limite_do_plano(v_plano, 'questoes_anos_minimo'), 0);
  -- "amostra" = o plano tem teto por dia ou so prova antiga (hoje: o grátis).
  v_amostra := v_por_dia is not null or v_anos > 0;
  v_pedir   := least(greatest(coalesce(p_limite, 10), 1), 50);

  if v_amostra then
    v_ano_teto := extract(year from (now() at time zone 'America/Sao_Paulo'))::int - v_anos;
    select count(*) into v_hoje
    from public.questoes_servidas
    where usuario_id = v_uid
      and (criado_em at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date;
    if v_por_dia is not null then
      v_restam := greatest(v_por_dia - v_hoje, 0);
      if v_restam = 0 then
        return jsonb_build_object(
          'questoes', '[]'::jsonb, 'plano', v_plano, 'acabou', true,
          'vistas_hoje', v_hoje, 'limite_do_dia', v_por_dia,
          'motivo', 'A amostra de hoje acabou. No Pro as questões são liberadas por inteiro.');
      end if;
      v_pedir := least(v_pedir, v_restam);
    end if;
  end if;

  select coalesce(jsonb_agg(q order by q->>'numero'), '[]'::jsonb),
         coalesce(array_agg((q->>'id')::bigint), '{}')
    into v_saida, v_ids
  from (
    select jsonb_build_object(
             'id', id, 'banca', banca, 'prova', prova, 'ano', ano,
             'numero', numero, 'materia', materia, 'assunto', assunto,
             'enunciado', enunciado, 'alternativas', alternativas,
             'gabarito', gabarito, 'explicacao', explicacao,
             'tipo', tipo, 'texto_apoio', texto_apoio) as q
    from public.questoes
    where publicada
      and (p_materia is null or materia = p_materia)
      and (p_assunto is null or assunto = p_assunto)
      and (p_banca   is null or banca   = p_banca)
      and (p_prova   is null or prova   = p_prova)
      and (p_ano     is null or ano     = p_ano)
      and (v_anos = 0 or ano <= v_ano_teto)
    order by random()
    limit v_pedir
  ) escolhidas;

  if array_length(v_ids, 1) > 0 then
    insert into public.questoes_servidas (usuario_id, questao_id)
    select v_uid, unnest(v_ids)
    on conflict (usuario_id, questao_id) do nothing;
  end if;

  return jsonb_build_object(
    'questoes', v_saida,
    'plano', v_plano,
    'acabou', false,
    'vistas_hoje', case when v_por_dia is not null then v_hoje + coalesce(array_length(v_ids,1),0) else null end,
    'limite_do_dia', v_por_dia,
    'fora_da_amostra', case when v_anos > 0 then (
      select count(*) from public.questoes
      where publicada and ano > v_ano_teto
        and (p_materia is null or materia = p_materia)
        and (p_assunto is null or assunto = p_assunto)
        and (p_banca   is null or banca   = p_banca)
        and (p_prova   is null or prova   = p_prova)) else 0 end);
end;
$$;
