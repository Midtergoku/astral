-- ============================================================================
-- AUDITORIA DE 30/09/2026 -- o que o servidor contava errado
--
-- Ele mandou uma auditoria dos prints da conta simulada (28 itens). Aqui o
-- que mora no banco:
--
-- 1. SEQUENCIA: as condecoracoes "Quinze/Trinta Dias em Pe" conferiam a
--    sequencia ATUAL. Quem fez 32 dias seguidos e depois falhou um dia via a
--    de 15 trancada. Conquista de sequencia e permanente: agora vale a MELHOR
--    sequencia (`melhorSequencia` em fatos_do_usuario).
-- 5. PONTOS DA INSTRUCAO: a escada do servidor parava em 35.000 XP e a das
--    patentes (assets/js/divisa.js, XP_POR_DEGRAU) vai ate 90.000, com
--    degraus diferentes a partir de 25.000. Uma escada so.
-- Nomes: as tags escolhidas antes do acento ("Memoria da Nacao") e a divisa
--    "Sentinela" (agora "Atalaia", porque a condecoracao de bronze ja se
--    chamava Sentinela) -- a escolha de quem ja tinha vestido nao se perde.
-- ============================================================================

create or replace function public.fatos_do_usuario()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
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
           count(distinct materia) filter (where materia is not null) as materias
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
        select extract(hour from criado_em at time zone 'America/Sao_Paulo')::int as h, count(*) as n
        from public.sessoes_estudo where usuario_id = v_uid group by 1
      ) x
    ), '{}'::jsonb),
    'porDiaSemana', coalesce((
      select jsonb_object_agg(d::text, n) from (
        select extract(dow from criado_em at time zone 'America/Sao_Paulo')::int as d, count(*) as n
        from public.sessoes_estudo where usuario_id = v_uid group by 1
      ) y
    ), '{}'::jsonb),
    'porModo', coalesce((
      select jsonb_object_agg(modo, n) from (
        select modo, count(*) as n from public.sessoes_estudo where usuario_id = v_uid group by 1
      ) z
    ), '{}'::jsonb)
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
      'dominioMenosEstudada', coalesce(v_menos_estudada, 0),
      'materias',         coalesce((select materias from public.progresso where usuario_id = v_uid), '[]'::jsonb),
      'atributos',        v_ficha->'atributos'
    );
end;
$$;

create or replace function public.avaliar_condicao(cond jsonb, fatos jsonb)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
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
    when 'dominioMinimo'  then atual := coalesce((fatos->>'dominioMinimo')::numeric, 0);  alvo := (cond->>'min')::numeric;
    when 'materiaMenosEstudada' then
      atual := coalesce((fatos->>'dominioMenosEstudada')::numeric, 0); alvo := (cond->>'dominioMin')::numeric;

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
$$;

create or replace function public.pontos_de_habilidade(xp_base integer)
returns integer language sql immutable set search_path = public as $$
  -- A MESMA escada de assets/js/divisa.js (XP_POR_DEGRAU, sem o degrau zero).
  select count(*)::integer
  from unnest(array[500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000,
                    32000, 42000, 55000, 70000, 90000]) as limiar
  where xp_base >= limiar;
$$;

update public.progresso set tag_escolhida = case tag_escolhida
    when 'Medico de Combate'        then 'Médico de Combate'
    when 'Memoria da Nacao'         then 'Memória da Nação'
    when 'Interprete'               then 'Intérprete'
    when 'Guardiao da Lei'          then 'Guardião da Lei'
    when 'Analista de Inteligencia' then 'Analista de Inteligência'
    when 'Sentinela'                then 'Atalaia'
    when 'Cronista de Guerra'       then 'Orador de Guerra'
    else tag_escolhida end
 where tag_escolhida in ('Medico de Combate', 'Memoria da Nacao', 'Interprete', 'Guardiao da Lei',
                         'Analista de Inteligencia', 'Sentinela', 'Cronista de Guerra');
