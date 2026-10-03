-- ============================================================================
-- Amplitude so com as materias do edital (03/10/2026)
-- Auditoria NUM-01 -- roadmap 2.5.
--
-- A Amplitude (ficha_do_usuario) dividia "materias distintas estudadas em 30
-- dias" -- QUALQUER materia, inclusive "Geral" e as de um edital antigo -- pelas
-- materias do edital atual. Quem trocou Bombeiros (9) por EEAR (4) via
-- "AMPLITUDE 100 · 9 materia(s) tocada(s) no mes, de 4 do edital", ganhava
-- "Frente Ampla" e "Batedor" sem nunca ter estudado Ingles.
--   -> conta so as materias do edital atual (sem edital: as estudadas, menos
--      "Geral").
--   -> o servidor transforma em "Geral" a sessao de materia que nao esta no
--      edital (validar_sessao_estudo), em vez de aceitar a materia inventada.
--
-- Gerada a partir das definicoes em producao em 03/10 (pg_get_functiondef),
-- com as trocas conferidas uma a uma -- nada copiado a mao.
-- As 2 medalhas ja dadas (Frente Ampla e Batedor) estao na conta simulada do
-- Lucas e sao merecidas pela regra nova tambem (9 de 9): nada a desfazer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ficha_do_usuario()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();

  v_dias_no_mes     integer := 0;
  v_materias_no_mes integer := 0;
  v_maior_sessao    integer := 0;
  v_horas_total     numeric := 0;
  v_sessoes_total   integer := 0;
  v_xp_medido       integer := 0;
  v_xp_declarado    integer := 0;

  v_materias_edital integer := 0;
  v_nomes_edital    text[];
  v_dominio_medio   numeric := 0;
  v_streak          integer := 0;
  v_xp_guardado     integer := 0;

  v_disciplina  integer := 0;
  v_resistencia integer := 0;
  v_amplitude   integer := 0;
  v_doutrina    integer := 0;

  v_prec        jsonb;
  v_respondidas integer := 0;
  v_primeira    integer := 0;
  c_minimo      constant integer := 20;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login para ver a ficha.'
      using errcode = '28000';
  end if;

  select array_agg(distinct lower(m->>'nome'))
    into v_nomes_edital
    from public.progresso p, jsonb_array_elements(p.materias) m
   where p.usuario_id = v_uid and coalesce(m->>'nome', '') <> '';

  select
    count(distinct (criado_em at time zone 'America/Sao_Paulo')::date)
      filter (where criado_em >= now() - interval '30 days'),
    -- 03/10/2026 (NUM-01): so materia do EDITAL ATUAL conta (com edital).
    -- Antes contava qualquer uma -- "9 de 4 do edital" = 100. Sem edital,
    -- conta as estudadas, menos "Geral" (tempo sem materia nao e materia).
    count(distinct lower(materia))
      filter (where criado_em >= now() - interval '30 days' and materia is not null
                and lower(materia) <> 'geral'
                and (v_nomes_edital is null or lower(materia) = any (v_nomes_edital))),
    coalesce(max(segundos) filter (where criado_em >= now() - interval '90 days'), 0) / 60,
    coalesce(sum(segundos), 0) / 3600.0,
    count(*),
    coalesce(sum(xp) filter (where modo in ('livre', 'pomodoro')), 0),
    coalesce(sum(xp) filter (where modo = 'cronograma'), 0)
  into
    v_dias_no_mes, v_materias_no_mes, v_maior_sessao,
    v_horas_total, v_sessoes_total, v_xp_medido, v_xp_declarado
  from public.sessoes_estudo
  where usuario_id = v_uid;

  select
    p.streak,
    p.xp,
    coalesce(jsonb_array_length(p.materias), 0),
    coalesce((
      select avg(greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0))))
      from jsonb_array_elements(p.materias) m
    ), 0)
  into v_streak, v_xp_guardado, v_materias_edital, v_dominio_medio
  from public.progresso p
  where p.usuario_id = v_uid;

  v_streak          := coalesce(v_streak, 0);
  v_xp_guardado     := coalesce(v_xp_guardado, 0);
  v_materias_edital := coalesce(v_materias_edital, 0);
  v_dominio_medio   := coalesce(v_dominio_medio, 0);

  v_disciplina := least(100, round(
      (least(1.0, v_dias_no_mes / 20.0) * 66)
    + (least(1.0, v_streak / 7.0) * 34)
  ));
  v_resistencia := least(100, round(least(1.0, v_maior_sessao / 90.0) * 100));
  v_amplitude := least(100, round(
    case
      when v_materias_edital > 0 then least(1.0, v_materias_no_mes::numeric / v_materias_edital)
      else least(1.0, v_materias_no_mes / 5.0)
    end * 100
  ));
  v_doutrina := least(100, greatest(0, round(v_dominio_medio)));

  v_prec        := public.minha_precisao();
  v_respondidas := coalesce((v_prec ->> 'respondidas')::integer, 0);
  v_primeira    := coalesce((v_prec ->> 'de_primeira')::integer, 0);

  return jsonb_build_object(
    'atributos', jsonb_build_object(
      'disciplina',  jsonb_build_object(
        'valor', v_disciplina,
        'porque', format('%s dia(s) de estudo nos últimos 30, sequência de %s', v_dias_no_mes, v_streak)),
      'resistencia', jsonb_build_object(
        'valor', v_resistencia,
        'porque', format('maior sessão: %s min', v_maior_sessao)),
      'amplitude',   jsonb_build_object(
        'valor', v_amplitude,
        'porque', format('%s de %s matéria(s) do edital estudada(s) nos últimos 30 dias', v_materias_no_mes, v_materias_edital)),
      'doutrina',    jsonb_build_object(
        'valor', v_doutrina,
        'porque', format('domínio médio de %s%%', round(v_dominio_medio))),
      -- Abaixo do minimo o valor e NULL: 3 questoes certas nao sao 100% de
      -- precisao, sao sorte. A tela mostra quantas faltam.
      'precisao',    jsonb_build_object(
        'valor', case when v_respondidas >= c_minimo
                      then round(v_primeira * 100.0 / v_respondidas)::integer end,
        'porque', case when v_respondidas >= c_minimo
                       then format('%s de %s questões do Banco acertadas de primeira', v_primeira, v_respondidas)
                       else format('responda mais %s questão(ões) do Banco para medir', c_minimo - v_respondidas) end)
    ),
    'sessoes', jsonb_build_object(
      'total', v_sessoes_total,
      'horas', round(v_horas_total, 1),
      'dias_no_mes', v_dias_no_mes,
      'maior_sessao_min', v_maior_sessao
    ),
    'xp', jsonb_build_object(
      'medido', v_xp_medido,
      'declarado', v_xp_declarado,
      'somado', v_xp_medido + v_xp_declarado,
      'guardado', v_xp_guardado
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.validar_sessao_estudo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_desde    timestamptz;
  v_hoje     date := (now() at time zone 'America/Sao_Paulo')::date;
  v_declarado integer;
begin
  if not public.gravacao_pelo_site() then
    return new;
  end if;

  new.criado_em := now();
  new.segundos  := greatest(0, coalesce(new.segundos, 0));

  -- 03/10/2026 (NUM-01): materia que NAO esta no edital da pessoa vira
  -- "Geral". Antes o servidor aceitava "Ingles" num edital de Bombeiros
  -- (HTTP 201) e a materia inventada contava nos atributos. Nao RECUSA: quem
  -- trocou de edital com o cronometro aberto perderia o tempo que estudou de
  -- verdade. O tempo e o XP ficam; a materia que nao existe nao.
  if new.materia is not null and lower(new.materia) <> 'geral' and not exists (
       select 1 from public.progresso p, jsonb_array_elements(p.materias) m
        where p.usuario_id = new.usuario_id and lower(m->>'nome') = lower(new.materia)) then
    new.materia := 'Geral';
  end if;

  if new.modo = 'cronograma' then
    if new.segundos > 4 * 3600 then
      raise exception 'sessao do cronograma acima de 4 horas' using errcode = '22023';
    end if;
    select coalesce(sum(segundos), 0) into v_declarado
      from public.sessoes_estudo
     where usuario_id = new.usuario_id and modo = 'cronograma'
       and (criado_em at time zone 'America/Sao_Paulo')::date = v_hoje;
    if v_declarado + new.segundos > 12 * 3600 then
      raise exception 'limite de 12 horas declaradas por dia' using errcode = '22023';
    end if;
    new.xp := case when new.segundos >= 60
                   then greatest(10, round(new.segundos / 120.0))::integer else 0 end;
  else
    -- Medida: o relogio tem de ter tido tempo de correr.
    select greatest(
             (select max(criado_em) from public.sessoes_estudo
               where usuario_id = new.usuario_id and modo in ('livre', 'pomodoro')),
             (select created_at from auth.users where id = new.usuario_id))
      into v_desde;
    if v_desde is not null
       and new.segundos > extract(epoch from (now() - v_desde)) + 120 then
      raise exception 'sessao mais longa que o tempo que passou' using errcode = '22023';
    end if;
    new.xp := (floor(new.segundos / 60.0) * 2)::integer;
  end if;

  return new;
end;
$function$;
