-- ============================================================================
-- Filtrar pelo CONCURSO, e nao so pela banca.
--
-- Pedido dele em 23/09/2026: "la no filtro ja e bom colocar (...) de todas as
-- provas de todos os concursos que tem. Bombeiro, CFO, policial, PRF. Porque
-- ali tambem e um filtro bem melhor e e bom para a pessoa saber o que ela
-- quer mais objetivamente."
--
-- "Banca" e a instituicao (EEAR, CBMES). "Prova" e o concurso propriamente
-- dito (CFS 2/2025, CFSd Soldado TIPO A) -- que e o que a pessoa tem na
-- cabeca quando diz "quero fazer a prova de bombeiro de 2022".
--
-- ⚠️ A ASSINATURA MUDA, entao a funcao ANTIGA precisa sair. Em Postgres,
-- `create or replace` com uma lista de parametros diferente cria uma SEGUNDA
-- funcao sobrecarregada em vez de substituir -- e ai o PostgREST nao sabe qual
-- chamar e devolve erro de ambiguidade. Este `drop` explicito e o que evita
-- isso; sem ele, a tela quebraria para todo mundo.
-- ============================================================================

drop function if exists public.sortear_questoes(text, text, text, int, int);

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
  v_free      boolean;
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
  v_free := coalesce(v_plano, 'free') = 'free';
  v_pedir := least(greatest(coalesce(p_limite, 10), 1), 50);

  if v_free then
    v_ano_teto := extract(year from (now() at time zone 'America/Sao_Paulo'))::int - 4;
    select count(*) into v_hoje
    from public.questoes_servidas
    where usuario_id = v_uid
      and (criado_em at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date;
    v_restam := greatest(10 - v_hoje, 0);
    if v_restam = 0 then
      return jsonb_build_object(
        'questoes', '[]'::jsonb, 'plano', v_plano, 'acabou', true,
        'vistas_hoje', v_hoje, 'limite_do_dia', 10,
        'motivo', 'A amostra de hoje acabou. No Pro as questoes sao liberadas por inteiro.');
    end if;
    v_pedir := least(v_pedir, v_restam);
  end if;

  select coalesce(jsonb_agg(q order by q->>'numero'), '[]'::jsonb),
         coalesce(array_agg((q->>'id')::bigint), '{}')
    into v_saida, v_ids
  from (
    select jsonb_build_object(
             'id', id, 'banca', banca, 'prova', prova, 'ano', ano,
             'numero', numero, 'materia', materia, 'assunto', assunto,
             'enunciado', enunciado, 'alternativas', alternativas,
             'gabarito', gabarito, 'explicacao', explicacao) as q
    from public.questoes
    where publicada
      and (p_materia is null or materia = p_materia)
      and (p_assunto is null or assunto = p_assunto)
      and (p_banca   is null or banca   = p_banca)
      and (p_prova   is null or prova   = p_prova)
      and (p_ano     is null or ano     = p_ano)
      and (not v_free or ano <= v_ano_teto)
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
    'vistas_hoje', case when v_free then v_hoje + coalesce(array_length(v_ids,1),0) else null end,
    'limite_do_dia', case when v_free then 10 else null end,
    'fora_da_amostra', case when v_free then (
      select count(*) from public.questoes
      where publicada and ano > v_ano_teto
        and (p_materia is null or materia = p_materia)
        and (p_assunto is null or assunto = p_assunto)
        and (p_banca   is null or banca   = p_banca)
        and (p_prova   is null or prova   = p_prova)) else 0 end);
end;
$$;

revoke all on function public.sortear_questoes(text, text, text, int, int, text) from public, anon;
grant execute on function public.sortear_questoes(text, text, text, int, int, text) to authenticated;
