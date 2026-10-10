-- ============================================================================
-- O PROGRESSO DAS CONDECORACOES VEM DO SERVIDOR (10/10/2026 -- auditoria COD-01, roadmap 3.21)
--
-- A regra de cada uma das 74 condecoracoes (e das divisas) existia DUAS vezes:
-- avaliar_condicao (servidor, que CONCEDE) e progressoDe (navegador, que
-- desenhava o "falta pouco: 98%"). Cada conserto tinha de ser feito nos dois;
-- esquecer um lado fazia a barra e a medalha gravada discordarem.
--
-- Agora fatos_do_usuario() devolve tambem:
--   progresso         { id_da_condecoracao: 0..1 }  (menos 'condecoracao' e 'todas',
--                                                    que dependem do que ja caiu)
--   progressoDivisas  { id_da_divisa: 0..1 }        (menos as de tipo 'condecoracao')
-- calculados por avaliar_condicao -- a mesma conta que concede. O navegador
-- (assets/js/condecoracoes.js) usa estes numeros; a copia dele so roda quando
-- eles nao vem (o testa-motor, que testa o motor puro). O testa-paridade-medalhas
-- confere, numa conta de verdade, que as duas contas dao o mesmo numero.
--
-- progresso_das_conquistas(fatos) so le o CATALOGO (que o aluno ja le) e os
-- fatos recebidos -- nenhum dado de ninguem. Gerada fatos_do_usuario a partir
-- da definicao em producao, trocando so o fim.
-- ============================================================================

create or replace function public.progresso_das_conquistas(p_fatos jsonb)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'progresso', coalesce((
      select jsonb_object_agg(c.id, round(public.avaliar_condicao(c.condicao, p_fatos), 4))
      from public.catalogo_condecoracoes c
      where c.condicao->>'tipo' not in ('condecoracao', 'todas')), '{}'::jsonb),
    'progressoDivisas', coalesce((
      select jsonb_object_agg(d.id, round(public.avaliar_condicao(d.condicao, p_fatos), 4))
      from public.catalogo_divisas d
      where d.condicao->>'tipo' <> 'condecoracao'), '{}'::jsonb)
  );
$$;
revoke all on function public.progresso_das_conquistas(jsonb) from public, anon;
grant execute on function public.progresso_das_conquistas(jsonb) to authenticated, service_role;

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
         coalesce(sum(xp), 0), coalesce(max(segundos) filter (where modo in ('livre', 'pomodoro')), 0) / 60
  into v_sessoes, v_horas, v_xp_sessoes, v_maior_sessao
  from public.sessoes_estudo where usuario_id = v_uid;

  with por_dia as (
    select dia as dia,
           count(*) as qtd,
           coalesce(sum(segundos) filter (where modo in ('livre', 'pomodoro')), 0) / 3600.0 as horas,   -- horas MEDIDAS no dia (GAM-02)
           -- 03/10/2026: "Geral" (tempo sem materia) nao e materia.
           count(distinct lower(materia)) filter (where materia is not null and lower(materia) <> 'geral') as materias
    from public.sessoes_estudo
    where usuario_id = v_uid
    group by 1
  )
  select (select count(*) from public.dias_de_estudo(v_uid)), coalesce(max(qtd), 0), coalesce(max(horas), 0), coalesce(max(materias), 0)
  into v_dias, v_sessoes_dia, v_horas_dia, v_materias_dia
  from por_dia;

  -- 03/10/2026: meses, semanas, retorno e sequencia contam dia ESTUDADO (15 min).
  select count(distinct date_trunc('month', x))
  into v_meses from public.dias_de_estudo(v_uid) x;

  -- 04/10/2026 (GAM-04): semana sem brecha = estudou TODOS os dias de estudo da
  -- rotina naquela semana (a folga nao e brecha). Era: 7 dias de 7.
  with folgas as (select public.dias_de_folga(v_uid) as f),
  por_semana as (
    select date_trunc('week', x) as semana,
           count(*) filter (where extract(dow from x)::integer <> all(folgas.f)) as dias
    from public.dias_de_estudo(v_uid) x, folgas group by 1
  )
  select count(*) into v_semanas_perf from por_semana, folgas
   where dias >= 7 - coalesce(array_length(folgas.f, 1), 0);

  with dias_materia as (
    select distinct materia, dia as dia
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
    select d as dia from public.dias_de_estudo(v_uid) d
  ),
  saltos as (
    select dia - lag(dia) over (order by dia) as intervalo from dias
  )
  select coalesce(max(intervalo), 0) into v_retorno from saltos;

  -- 30/09/2026: a MELHOR sequencia de todos os tempos (ilhas de dias seguidos).
  -- Conquista de sequencia e permanente: quem ja fez 32 dias seguidos fez 15.
  -- 04/10/2026 (GAM-04): com a folga da rotina como ponte (sequencias_de_estudo)
  select coalesce(max(seq), 0) into v_melhor_seq from public.sequencias_de_estudo(v_uid);

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
          select d as dia from public.dias_de_estudo(v_uid) d
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
        group by date_trunc('month', dia)
      ) mm
    ), 0)
  ) into v_fatos;

  select p.streak, p.xp, (p.edital is not null),
         coalesce((select min(greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0))))
                   from jsonb_array_elements(public.materias_para_medalhas()) m), 0)
  into v_streak, v_xp, v_tem_edital, v_dominio_min
  from public.progresso p where p.usuario_id = v_uid;

  select coalesce((
    select greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0)))
    from jsonb_array_elements(public.materias_para_medalhas()) m
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

  v_fatos := v_fatos
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
        -- 09/10/2026 (NUM-08): ponderada pelo peso, como a Doutrina (sem peso: a simples)
        select round(case when sum((case when (m->>'peso') ~ '^[0-9]+([.][0-9]+)?$' then (m->>'peso')::numeric else 0 end)) > 0
          then sum(least(100, greatest(0, coalesce((m->>'progresso')::numeric, 0))
                 * case when m->'medida'->>'fonte' = 'estudo' then 100.0 / 70 else 1 end) * (case when (m->>'peso') ~ '^[0-9]+([.][0-9]+)?$' then (m->>'peso')::numeric else 0 end)) / sum((case when (m->>'peso') ~ '^[0-9]+([.][0-9]+)?$' then (m->>'peso')::numeric else 0 end))
          else avg(least(100, greatest(0, coalesce((m->>'progresso')::numeric, 0))
                 * case when m->'medida'->>'fonte' = 'estudo' then 100.0 / 70 else 1 end)) end)
        from public.progresso p, jsonb_array_elements(public.materias_para_medalhas()) m
        where p.usuario_id = v_uid), 0),
      'dominioMenosEstudada', coalesce(v_menos_estudada, 0),
      'materias',         coalesce(public.materias_para_medalhas(), '[]'::jsonb),
      'atributos',        v_ficha->'atributos'
    );
  -- 10/10/2026 (COD-01, roadmap 3.21): o progresso de cada condecoracao e divisa, pela MESMA regra que
  -- concede (avaliar_condicao). A tela so mostra -- a regra deixou de ter de ser consertada duas vezes.
  return v_fatos || public.progresso_das_conquistas(v_fatos);
end;
$function$;
