-- ============================================================================
-- O gabarito so depois da resposta (08/10/2026) -- auditoria GAM-03, roadmap 3.12
--
-- O QUE ESTAVA ERRADO: sortear_questoes devolvia o GABARITO e a EXPLICACAO junto
-- com o enunciado. A tela so os mostrava depois do clique, mas eles ja estavam no
-- navegador: quem abria o console respondia 10 de 10 certas de primeira e o
-- dominio da materia subia sem estudo (auditoria: Portugues a 20% em uma rodada).
-- O caderno de erros fazia o mesmo com as questoes do acervo.
--
-- O QUE PASSA A HAVER:
--   - sortear_questoes e caderno_de_erros (acervo) mandam so 'tem_gabarito'
--   - registrar_resposta, DEPOIS de gravar a resposta, devolve 'gabarito' e
--     'explicacao' -- a tela corrige com o que o servidor diz
--   - questao do proprio aluno (questoes_minhas) continua como era: e dele
--
-- O dominio ja contava so o acerto DE PRIMEIRA (vezes_errou = 0): responder de
-- novo depois de ver o gabarito nao infla nada (conferido pelo teste).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sortear_questoes(p_materia text DEFAULT NULL::text, p_assunto text DEFAULT NULL::text, p_banca text DEFAULT NULL::text, p_ano integer DEFAULT NULL::integer, p_limite integer DEFAULT 10, p_prova text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
             'tem_gabarito', gabarito is not null,
             'tipo', tipo, 'texto_apoio', texto_apoio, 'imagem', imagem) as q
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
$function$;

CREATE OR REPLACE FUNCTION public.caderno_de_erros(p_materia text DEFAULT NULL::text, p_limite integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid   uuid := auth.uid();
  v_lim   int  := least(greatest(coalesce(p_limite, 10), 1), 50);
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'questoes', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id', q.id, 'origem', 'acervo', 'banca', q.banca, 'prova', q.prova,
          'ano', q.ano, 'numero', q.numero, 'materia', q.materia, 'assunto', q.assunto,
          'enunciado', q.enunciado, 'alternativas', q.alternativas, 'tem_gabarito', q.gabarito is not null,
          'tipo', q.tipo, 'texto_apoio', q.texto_apoio, 'imagem', q.imagem,
          'vezes_errou', r.vezes_errou, 'letra_anterior', r.letra) as x,
          r.vezes_errou as ordem, r.atualizado_em as quando
        from public.respostas r
        join public.questoes q on q.id = r.questao_id and q.publicada
        where r.usuario_id = v_uid and not r.acertou
          and (p_materia is null or q.materia = p_materia)
        union all
        select jsonb_build_object(
          'id', m.id, 'origem', 'minha', 'banca', m.origem, 'prova', m.origem,
          'ano', null, 'numero', null, 'materia', coalesce(m.materia, 'sua questão'),
          'assunto', m.assunto, 'enunciado', m.enunciado, 'alternativas', m.alternativas,
          'gabarito', m.gabarito, 'explicacao', m.explicacao, 'tipo', m.tipo,
          'texto_apoio', m.texto_apoio, 'imagem', null,
          'vezes_errou', r.vezes_errou, 'letra_anterior', r.letra),
          r.vezes_errou, r.atualizado_em
        from public.respostas r
        join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
        where r.usuario_id = v_uid and not r.acertou
          and (p_materia is null or coalesce(m.materia, 'sua questão') = p_materia)
        order by 2 desc, 3 desc
        limit v_lim
      ) t
    ), '[]'::jsonb),
    'por_materia', coalesce((
      select jsonb_agg(jsonb_build_object('nome', materia, 'quantas', n) order by n desc)
      from (
        select coalesce(q.materia, m.materia, 'sua questão') as materia, count(*) as n
        from public.respostas r
        left join public.questoes q on q.id = r.questao_id and q.publicada
        left join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
        where r.usuario_id = v_uid and not r.acertou
          and (q.id is not null or m.id is not null)
        group by 1
      ) pm
    ), '[]'::jsonb),
    'total', (select count(*) from public.respostas r
              left join public.questoes q on q.id = r.questao_id and q.publicada
              left join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
              where r.usuario_id = v_uid and not r.acertou
                and (q.id is not null or m.id is not null))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_resposta(p_origem text, p_id bigint, p_letra text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_letra   text := lower(btrim(coalesce(p_letra, '')));
  v_gab     text;
  v_acertou boolean;
  v_expl    text;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;
  if v_letra not in ('a','b','c','d','e') then
    raise exception 'letra invalida' using errcode = '22023';
  end if;

  if p_origem = 'acervo' then
    -- 🔴 A trava 2: so questao que ela JA RECEBEU.
    if not exists (select 1 from public.questoes_servidas
                   where usuario_id = v_uid and questao_id = p_id) then
      raise exception 'questao nao foi servida a voce' using errcode = '42501';
    end if;
    select gabarito, explicacao into v_gab, v_expl from public.questoes where id = p_id and publicada;
    if v_gab is null then
      raise exception 'questao indisponivel' using errcode = '22023';
    end if;
    v_acertou := (v_letra = v_gab);
    insert into public.respostas (usuario_id, questao_id, letra, acertou, vezes_errou, vezes_acertou)
    values (v_uid, p_id, v_letra, v_acertou,
            case when v_acertou then 0 else 1 end, case when v_acertou then 1 else 0 end)
    on conflict (usuario_id, questao_id) where questao_id is not null do update set
      letra = excluded.letra, acertou = excluded.acertou, atualizado_em = now(),
      vezes_errou   = public.respostas.vezes_errou   + excluded.vezes_errou,
      vezes_acertou = public.respostas.vezes_acertou + excluded.vezes_acertou;

  elsif p_origem = 'minha' then
    -- A questao tem de ser DELA. Le auth.uid(), nunca parametro.
    select gabarito, explicacao into v_gab, v_expl from public.questoes_minhas
    where id = p_id and usuario_id = v_uid;
    if not found then
      raise exception 'questao nao encontrada' using errcode = '42501';
    end if;
    -- Sem gabarito nao ha como errar nem acertar: nada a registrar.
    if v_gab is null then
      return jsonb_build_object('registrado', false, 'motivo', 'sem gabarito');
    end if;
    v_acertou := (v_letra = v_gab);
    insert into public.respostas (usuario_id, minha_id, letra, acertou, vezes_errou, vezes_acertou)
    values (v_uid, p_id, v_letra, v_acertou,
            case when v_acertou then 0 else 1 end, case when v_acertou then 1 else 0 end)
    on conflict (usuario_id, minha_id) where minha_id is not null do update set
      letra = excluded.letra, acertou = excluded.acertou, atualizado_em = now(),
      vezes_errou   = public.respostas.vezes_errou   + excluded.vezes_errou,
      vezes_acertou = public.respostas.vezes_acertou + excluded.vezes_acertou;
  else
    raise exception 'origem invalida' using errcode = '22023';
  end if;

  -- 08/10/2026 (GAM-03): o gabarito e a explicacao saem AQUI, depois de a resposta estar gravada.
  return jsonb_build_object('registrado', true, 'acertou', v_acertou, 'gabarito', v_gab, 'explicacao', v_expl);
end;
$function$;
