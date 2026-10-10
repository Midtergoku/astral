-- ============================================================================
-- A divisa secreta "Aprovado" (10/10/2026, guardado 3 -- "pode mandar bala", dele)
--
-- Quem marca "Passei!" (aprovacoes, roadmap 3.22) E tem 20 h de estudo registradas ganha a divisa APROVADO --
-- lendaria e SECRETA (so aparece quando cai). O clique sozinho nao vale: a regra dele e "nada se ganha com
-- clique, so estudando" (o testa-catalogo recusa condicao sem estudo). E DIVISA, nao condecoracao: a "Condecoracao
-- Maxima" (platina) conta condecoracoes, entao nada muda para quem esta perto dela.
--
--   fatos_do_usuario()  ganha 'aprovado' (gerada da definicao NO AR, so este trecho acrescentado)
--   avaliar_condicao()  ganha o tipo 'aprovado' (idem)
--   catalogo_divisas    ganha a linha 'aprovado'
-- A tela tem a copia da regra so para o testa-motor (assets/js/condecoracoes.js, progressoDe) e o
-- testa-paridade-medalhas confere que as duas concordam.
-- ============================================================================

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
      -- 10/10/2026: marcou "Passei!" (aprovacoes) -- a divisa secreta "Aprovado"
      'aprovado',         exists (select 1 from public.aprovacoes ap where ap.usuario_id = v_uid),
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

CREATE OR REPLACE FUNCTION public.avaliar_condicao(cond jsonb, fatos jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  t text := cond->>'tipo';
  alvo numeric;
  atual numeric := 0;
  chave text;
  h int;
  d text;
begin
  if cond is null or fatos is null then return 0; end if;

  case t
    when 'sessoes'        then atual := coalesce((fatos->>'sessoes')::numeric, 0);        alvo := (cond->>'min')::numeric;
    when 'horas'          then atual := coalesce((fatos->>'horas')::numeric, 0);          alvo := (cond->>'min')::numeric;
    when 'xp'             then atual := coalesce((fatos->>'xp')::numeric, 0);             alvo := (cond->>'min')::numeric;
    -- 30/09/2026: a MELHOR sequencia, nao a atual (auditoria dele, item 1).
    when 'streak'         then atual := greatest(coalesce((fatos->>'streak')::numeric, 0),
                                                 coalesce((fatos->>'melhorSequencia')::numeric, 0));
                               alvo := (cond->>'min')::numeric;
    when 'sessaoUnica'    then atual := coalesce((fatos->>'maiorSessaoMin')::numeric, 0); alvo := (cond->>'minutosMin')::numeric;
    when 'sessoesNoDia'   then atual := coalesce((fatos->>'sessoesNoDiaMax')::numeric, 0);  alvo := (cond->>'quantas')::numeric;
    when 'horasNoDia'     then atual := coalesce((fatos->>'horasNoDiaMax')::numeric, 0);    alvo := (cond->>'min')::numeric;
    when 'materiasNoDia'  then atual := coalesce((fatos->>'materiasNoDiaMax')::numeric, 0); alvo := (cond->>'quantas')::numeric;
    when 'diasEstudados'  then atual := coalesce((fatos->>'diasEstudados')::numeric, 0);  alvo := (cond->>'min')::numeric;
    when 'meses'          then atual := coalesce((fatos->>'meses')::numeric, 0);          alvo := (cond->>'min')::numeric;
    when 'semanaPerfeita' then atual := coalesce((fatos->>'semanasPerfeitas')::numeric, 0); alvo := (cond->>'vezes')::numeric;
    when 'materiaSeguida' then atual := coalesce((fatos->>'materiaSeguidaMax')::numeric, 0); alvo := (cond->>'dias')::numeric;
    when 'retorno'        then atual := coalesce((fatos->>'maiorRetornoDias')::numeric, 0); alvo := (cond->>'diasSumidoMin')::numeric;
    -- 03/10/2026 (GAM-05): dominio sobre o teto de cada materia.
    when 'dominioNoTeto'  then atual := coalesce((fatos->>'dominioNoTeto')::numeric, 0); alvo := (cond->>'min')::numeric;
    when 'dominioMinimo'  then atual := coalesce((fatos->>'dominioMinimo')::numeric, 0);  alvo := (cond->>'min')::numeric;
    when 'materiaMenosEstudada' then
      atual := coalesce((fatos->>'dominioMenosEstudada')::numeric, 0); alvo := (cond->>'dominioMin')::numeric;

    -- 10/10/2026: a divisa secreta "Aprovado" (3.22). Marcar "Passei!" e um CLIQUE, e a regra dele e "nada se
    -- ganha com clique" (testa-catalogo): exige tambem horasMin de estudo registrado.
    when 'aprovado' then
      if not coalesce((fatos->>'aprovado')::boolean, false) then return 0; end if;
      atual := coalesce((fatos->>'horas')::numeric, 0); alvo := (cond->>'horasMin')::numeric;

    when 'edital' then
      return case when coalesce((fatos->>'temEdital')::boolean, false) then 1 else 0 end;

    when 'atributo' then
      chave := cond->>'chave';
      atual := coalesce((fatos->'atributos'->chave->>'valor')::numeric, 0);
      alvo  := (cond->>'min')::numeric;

    when 'atributosTodos' then
      -- O progresso e o do PIOR, senao a barra mentiria dizendo "quase la"
      -- com um atributo zerado.
      alvo := (cond->>'min')::numeric;
      select coalesce(min(coalesce((fatos->'atributos'->(k#>>'{}')->>'valor')::numeric, 0)), 0)
      into atual
      from jsonb_array_elements(cond->'chaves') k;

    when 'materias' then
      alvo := (cond->>'quantas')::numeric;
      select count(*) into atual
      from jsonb_array_elements(coalesce(fatos->'materias', '[]'::jsonb)) m
      where coalesce((m->>'progresso')::numeric, 0) >= (cond->>'dominioMin')::numeric;

    when 'materiaDominada' then
      -- Nome de materia vem do edital e varia: compara sem acento e sem caixa.
      return case when exists (
        select 1
        from jsonb_array_elements(coalesce(fatos->'materias', '[]'::jsonb)) m
        join jsonb_array_elements_text(cond->'materias') alvo_nome
          on lower(unaccent_simples(alvo_nome)) = lower(unaccent_simples(m->>'nome'))
        where coalesce((m->>'progresso')::numeric, 0) >= (cond->>'dominioMin')::numeric
      ) then 1 else 0 end;

    when 'horario' then
      alvo := (cond->>'vezes')::numeric;
      atual := 0;
      for h in (cond->>'deHora')::int .. (cond->>'ateHora')::int - 1 loop
        atual := atual + coalesce((fatos->'porHora'->>h::text)::numeric, 0);
      end loop;

    when 'diaSemana' then
      alvo := (cond->>'vezes')::numeric;
      atual := 0;
      for d in select jsonb_array_elements_text(cond->'dias') loop
        atual := atual + coalesce((fatos->'porDiaSemana'->>d)::numeric, 0);
      end loop;

    -- 03/10/2026 (NUM-02): DIAS distintos (nao sessoes) em dias da semana.
    when 'diasDaSemana' then
      alvo := (cond->>'vezes')::numeric;
      atual := 0;
      for d in select jsonb_array_elements_text(cond->'dias') loop
        atual := atual + coalesce((fatos->'diasPorDiaSemana'->>d)::numeric, 0);
      end loop;

    when 'materiasNoMes' then
      atual := coalesce((fatos->>'materiasNoMesMax')::numeric, 0);
      alvo  := (cond->>'quantas')::numeric;

    when 'modo' then
      atual := coalesce((fatos->'porModo'->>(cond->>'modo'))::numeric, 0);
      alvo  := (cond->>'vezes')::numeric;

    -- 'condecoracao' e 'todas' dependem do que ja caiu; resolvidos na funcao
    -- de sincronia, em duas passadas, e nao aqui.
    else
      return 0;
  end case;

  if alvo is null or alvo <= 0 then return 0; end if;
  return least(1, atual / alvo);
end;
$function$;

insert into public.catalogo_divisas (id, raridade, secreta, nome, como_ganha, cor, condicao)
values ('aprovado', 'lendaria', true, 'Aprovado', 'secreta', 'var(--latao-c)', '{"tipo":"aprovado","horasMin":20}'::jsonb)
on conflict (id) do update set raridade = excluded.raridade, secreta = excluded.secreta, nome = excluded.nome,
  como_ganha = excluded.como_ganha, cor = excluded.cor, condicao = excluded.condicao;
