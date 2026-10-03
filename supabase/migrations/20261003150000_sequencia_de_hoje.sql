-- ============================================================================
-- A sequencia mostrada e a de HOJE (03/10/2026)
-- Auditoria NUM-14 -- roadmap 2.13.
--
-- progresso.streak e recalculado pelo gatilho progresso_do_servidor SO quando o
-- progresso e gravado. O topo do painel, a ficha (Disciplina) e os fatos das
-- condecoracoes liam esse valor guardado: o usuario "quebrou" (ultima sessao
-- 30/09) abriu o painel em 02/10 e viu "2 dias" e Disciplina 76; a pagina
-- salvou, e so na abertura seguinte apareceram 0 e 66.
--
-- minha_sequencia(): a sequencia de quem pergunta, calculada na hora a partir
-- das sessoes (sequencia_do_usuario, a mesma conta do gatilho). Security
-- definer porque sequencia_do_usuario(uuid) nao e executavel por ninguem de
-- fora -- e continua nao sendo: esta so responde sobre auth.uid().
-- ============================================================================

create or replace function public.minha_sequencia()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.sequencia_do_usuario(auth.uid()), 0);
$$;
revoke all on function public.minha_sequencia() from public, anon;
grant execute on function public.minha_sequencia() to authenticated;

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

  -- 03/10/2026 (NUM-14): a sequencia de HOJE, calculada das sessoes -- o
  -- progresso.streak guardado so muda quando a pagina salva, e na 1a abertura
  -- do dia mostrava "2 dias" para quem ja tinha perdido a sequencia.
  v_streak          := public.minha_sequencia();
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

CREATE OR REPLACE FUNCTION public.fatos_do_usuario()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_fatos jsonb;
  v_ficha jsonb;

  v_sessoes        integer := 0;
  v_horas          numeric := 0;
  v_xp_sessoes     integer := 0;
  v_maior_sessao   integer := 0;
  v_dias           integer := 0;
  v_meses          integer := 0;
  v_sessoes_dia    integer := 0;
  v_horas_dia      numeric := 0;
  v_materias_dia   integer := 0;
  v_semanas_perf   integer := 0;
  v_materia_seg    integer := 0;
  v_retorno        integer := 0;
  v_melhor_seq     integer := 0;
  v_ultimo         jsonb   := '{}'::jsonb;

  v_streak         integer := 0;
  v_xp             integer := 0;
  v_tem_edital     boolean := false;
  v_dominio_min    numeric := 0;
  v_menos_estudada numeric := 0;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  select count(*), coalesce(sum(segundos), 0) / 3600.0,
         coalesce(sum(xp), 0), coalesce(max(segundos), 0) / 60
  into v_sessoes, v_horas, v_xp_sessoes, v_maior_sessao
  from public.sessoes_estudo where usuario_id = v_uid;

  with por_dia as (
    select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
           count(*) as qtd,
           sum(segundos) / 3600.0 as horas,
           -- 03/10/2026: "Geral" (tempo sem materia) nao e materia.
           count(distinct lower(materia)) filter (where materia is not null and lower(materia) <> 'geral') as materias
    from public.sessoes_estudo
    where usuario_id = v_uid
    group by 1
  )
  select count(*), coalesce(max(qtd), 0), coalesce(max(horas), 0), coalesce(max(materias), 0)
  into v_dias, v_sessoes_dia, v_horas_dia, v_materias_dia
  from por_dia;

  select count(distinct date_trunc('month', criado_em at time zone 'America/Sao_Paulo'))
  into v_meses from public.sessoes_estudo where usuario_id = v_uid;

  with por_semana as (
    select date_trunc('week', criado_em at time zone 'America/Sao_Paulo') as semana,
           count(distinct (criado_em at time zone 'America/Sao_Paulo')::date) as dias
    from public.sessoes_estudo where usuario_id = v_uid group by 1
  )
  select count(*) into v_semanas_perf from por_semana where dias >= 7;

  with dias_materia as (
    select distinct materia, (criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.sessoes_estudo
    where usuario_id = v_uid and materia is not null
  ),
  numerados as (
    select materia, dia,
           dia - (row_number() over (partition by materia order by dia))::integer as ilha
    from dias_materia
  )
  select coalesce(max(qtd), 0) into v_materia_seg
  from (select materia, ilha, count(*) as qtd from numerados group by 1, 2) c;

  with dias as (
    select distinct (criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.sessoes_estudo where usuario_id = v_uid
  ),
  saltos as (
    select dia - lag(dia) over (order by dia) as intervalo from dias
  )
  select coalesce(max(intervalo), 0) into v_retorno from saltos;

  -- 30/09/2026: a MELHOR sequencia de todos os tempos (ilhas de dias seguidos).
  -- Conquista de sequencia e permanente: quem ja fez 32 dias seguidos fez 15.
  with dias as (
    select distinct (criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.sessoes_estudo where usuario_id = v_uid
  ),
  ilhas as (select dia - (row_number() over (order by dia))::integer as ilha from dias)
  select coalesce(max(qtd), 0) into v_melhor_seq
  from (select ilha, count(*) as qtd from ilhas group by 1) c;

  -- ── 🆕 A ULTIMA VEZ DE CADA MATERIA ──────────────────────────────────────
  -- Chave em minusculas porque o nome vem do edital e varia de caixa entre
  -- uma sessao e outra ("Matemática" e "matemática" sao a mesma materia para
  -- quem estuda). Quem consome compara em minusculas tambem.
  select coalesce(jsonb_object_agg(lower(materia), ultimo), '{}'::jsonb)
  into v_ultimo
  from (
    select materia, max(criado_em) as ultimo
    from public.sessoes_estudo
    where usuario_id = v_uid and materia is not null
    group by 1
  ) u;

  select jsonb_build_object(
    'porHora', coalesce((
      select jsonb_object_agg(h::text, n) from (
        -- 03/10/2026 (NUM-02): a hora em que a sessao COMECOU. criado_em e o
        -- FIM: quem comecou 23h50 e terminou 0h40 ganhava "Turno da Noite"
        -- ("sessoes comecadas depois da meia-noite") sem ter comecado nenhuma.
        select extract(hour from (criado_em - make_interval(secs => segundos)) at time zone 'America/Sao_Paulo')::int as h, count(*) as n
        from public.sessoes_estudo where usuario_id = v_uid group by 1
      ) x
    ), '{}'::jsonb),
    'porDiaSemana', coalesce((
      select jsonb_object_agg(d::text, n) from (
        select extract(dow from (criado_em - make_interval(secs => segundos)) at time zone 'America/Sao_Paulo')::int as d, count(*) as n
        from public.sessoes_estudo where usuario_id = v_uid group by 1
      ) y
    ), '{}'::jsonb),
    -- 03/10/2026 (NUM-02): "Dez segundas-feiras estudadas" sao DEZ DIAS, nao
    -- dez sessoes -- quem fazia 3 sessoes por segunda ganhava com 4 segundas.
    'diasPorDiaSemana', coalesce((
      select jsonb_object_agg(d::text, n) from (
        select extract(dow from dia)::int as d, count(*) as n from (
          select distinct ((criado_em - make_interval(secs => segundos)) at time zone 'America/Sao_Paulo')::date as dia
          from public.sessoes_estudo where usuario_id = v_uid
        ) dd group by 1
      ) w
    ), '{}'::jsonb),
    -- 'medido' = livre + pomodoro: o relogio correu. "Relogio na Mao" contava
    -- so 'livre' -- quem usava pomodoro nunca ganhava.
    'porModo', coalesce((
      select jsonb_object_agg(modo, n) from (
        select modo, count(*) as n from public.sessoes_estudo where usuario_id = v_uid group by 1
        union all
        select 'medido', count(*) from public.sessoes_estudo
         where usuario_id = v_uid and modo in ('livre', 'pomodoro')
      ) z
    ), '{}'::jsonb),
    -- "Duas materias diferentes no mesmo mes": o MELHOR mes do calendario.
    -- Antes era Amplitude >= 40 -- num edital de 9, quatro materias.
    'materiasNoMesMax', coalesce((
      select max(n) from (
        select count(distinct lower(materia)) as n
        from public.sessoes_estudo
        where usuario_id = v_uid and materia is not null and lower(materia) <> 'geral'
        group by date_trunc('month', criado_em at time zone 'America/Sao_Paulo')
      ) mm
    ), 0)
  ) into v_fatos;

  select p.streak, p.xp, (p.edital is not null),
         coalesce((select min(greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0))))
                   from jsonb_array_elements(p.materias) m), 0)
  into v_streak, v_xp, v_tem_edital, v_dominio_min
  from public.progresso p where p.usuario_id = v_uid;

  select coalesce((
    select greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0)))
    from jsonb_array_elements((select materias from public.progresso where usuario_id = v_uid)) m
    join (
      select materia, sum(segundos) as total
      from public.sessoes_estudo
      where usuario_id = v_uid and materia is not null
      group by 1
    ) s on lower(s.materia) = lower(m->>'nome')
    where (select count(distinct materia) from public.sessoes_estudo
           where usuario_id = v_uid and materia is not null) >= 2
    order by s.total asc
    limit 1
  ), 0) into v_menos_estudada;

  -- 03/10/2026 (NUM-14): a sequencia de hoje, nao a guardada.
  v_streak := public.minha_sequencia();

  v_ficha := public.ficha_do_usuario();

  return v_fatos
    || jsonb_build_object(
      'sessoes',          v_sessoes,
      'horas',            round(v_horas, 2),
      'xpSessoes',        v_xp_sessoes,
      'maiorSessaoMin',   v_maior_sessao,
      'diasEstudados',    v_dias,
      'meses',            v_meses,
      'sessoesNoDiaMax',  v_sessoes_dia,
      'horasNoDiaMax',    round(v_horas_dia, 2),
      'materiasNoDiaMax', v_materias_dia,
      'semanasPerfeitas', v_semanas_perf,
      'materiaSeguidaMax', v_materia_seg,
      'maiorRetornoDias', v_retorno,
      'ultimoEstudoPorMateria', v_ultimo,
      'streak',           coalesce(v_streak, 0),
      'melhorSequencia',  greatest(coalesce(v_melhor_seq, 0), coalesce(v_streak, 0)),
      'xp',               coalesce(v_xp, 0),
      'temEdital',        coalesce(v_tem_edital, false),
      'dominioMinimo',    coalesce(v_dominio_min, 0),
      -- 03/10/2026 (GAM-05): a media do dominio sobre o TETO de cada materia --
      -- 100 com Banco, 70 sem Banco (dominio_formula, 30/09). "Doutrina
      -- Consolidada" usa isto; o atributo DOUTRINA continua sendo a media
      -- crua, porque entra no Preparo.
      'dominioNoTeto', coalesce((
        select round(avg(least(100, greatest(0, coalesce((m->>'progresso')::numeric, 0))
                 * case when m->'medida'->>'fonte' = 'estudo' then 100.0 / 70 else 1 end)))
        from public.progresso p, jsonb_array_elements(p.materias) m
        where p.usuario_id = v_uid), 0),
      'dominioMenosEstudada', coalesce(v_menos_estudada, 0),
      'materias',         coalesce((select materias from public.progresso where usuario_id = v_uid), '[]'::jsonb),
      'atributos',        v_ficha->'atributos'
    );
end;
$function$;
