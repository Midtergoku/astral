-- ============================================================================
-- A folga da rotina nao quebra a sequencia (04/10/2026)
-- Auditoria GAM-04 -- roadmap 3.8. Decisao dele (pergunta 7): "Concordo".
--
-- O QUE ESTAVA ERRADO: a sequencia contava dias de CALENDARIO e ignorava a
-- rotina. Quem estuda de segunda a sabado -- o que o proprio cronograma manda,
-- e o painel diz "Hoje e folga na sua rotina" -- quebrava a sequencia todo
-- domingo. Medido na conta `folga` da auditoria: 30 dias de estudo, melhor
-- sequencia 6. Ficavam IMPOSSIVEIS 10 condecoracoes (Semana Completa, Quinze e
-- Trinta Dias em Pe...), 5 divisas, e o bonus de 3 especializacoes nunca disparava.
--
-- A REGRA: o dia de folga da rotina e um FERIADO para a sequencia -- nao quebra
-- e nao conta. Estudar na folga conta normalmente. Faltar num dia de estudo quebra.
--   - folga = dia fora de rotina.dias; com a semana editada a mao (rotina.semana),
--     o dia sem bloco nenhum. Sem rotina: a padrao, segunda a sabado (a mesma de
--     assets/js/cronograma.js, normalizarRotina) -- o painel ja mostra domingo
--     como folga para essa pessoa.
--   - vale a rotina de HOJE para todo o historico: mudar a rotina muda a conta
--     da sequencia. As condecoracoes ja gravadas sao permanentes.
--   - "a mesma materia N dias seguidos" continua por calendario (e outra conta,
--     de outra conquista).
-- ============================================================================

-- Os dias da semana (0 = domingo, como no JavaScript) que sao folga na rotina.
create or replace function public.dias_de_folga(p_uid uuid)
returns integer[] language sql stable set search_path = public as $$
  with r as (select rotina from public.progresso where usuario_id = p_uid),
  estuda as (
    select case
      when jsonb_typeof(r.rotina->'semana') = 'array' and jsonb_array_length(r.rotina->'semana') = 7 then
        (select coalesce(array_agg((s.i - 1)::integer), '{}')
           from jsonb_array_elements(r.rotina->'semana') with ordinality as s(b, i)
          where jsonb_typeof(s.b) = 'array' and jsonb_array_length(s.b) > 0)
      when jsonb_typeof(r.rotina->'dias') = 'array' then
        (select coalesce(array_agg(distinct x::integer), '{}')
           from jsonb_array_elements_text(r.rotina->'dias') x where x ~ '^[0-6]$')
      else null
    end as dias
    from r
  )
  select coalesce((
    select array_agg(d order by d) from generate_series(0, 6) d
     where d <> all(coalesce(nullif((select dias from estuda), '{}'::integer[]), array[1, 2, 3, 4, 5, 6]))
  ), '{}'::integer[]);
$$;
revoke all on function public.dias_de_folga(uuid) from public, anon;
grant execute on function public.dias_de_folga(uuid) to authenticated, service_role;

-- A sequencia de CADA dia estudado, com a folga como ponte.
--   d    = dia estudado (15 min, dias_de_estudo)
--   seq  = posicao dele na sequencia (1, 2, 3...)
--   ilha = numero da sequencia (para agrupar)
-- Como: entre o primeiro dia estudado e hoje, so contam os dias "que importam" --
-- dia de estudo da rotina, ou dia em que estudou. Folga sem estudo some da fila,
-- entao nao separa nada.
create or replace function public.sequencias_de_estudo(p_uid uuid)
returns table (d date, seq integer, ilha integer)
language sql stable set search_path = public as $$
  with folgas as (select public.dias_de_folga(p_uid) as f),
  estudo as (select x as d from public.dias_de_estudo(p_uid) x),
  dias as (
    select g::date as d
      from (select min(d) as ini from estudo) lim,
           generate_series(lim.ini, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') g
     where lim.ini is not null
  ),
  importam as (
    select dd.d, (e.d is not null) as estudou
      from dias dd left join estudo e on e.d = dd.d, folgas
     where e.d is not null or extract(dow from dd.d)::integer <> all(folgas.f)
  ),
  numerados as (select i.d, i.estudou, row_number() over (order by i.d) as ord from importam i),
  so_estudo as (
    select n.d, (n.ord - row_number() over (order by n.d))::integer as ilha
      from numerados n where n.estudou
  )
  select s.d, (row_number() over (partition by s.ilha order by s.d))::integer as seq, s.ilha
    from so_estudo s;
$$;
revoke all on function public.sequencias_de_estudo(uuid) from public, anon;
grant execute on function public.sequencias_de_estudo(uuid) to authenticated, service_role;

-- A sequencia de HOJE: viva se nenhum dia de estudo da rotina passou em branco
-- entre o ultimo dia estudado e hoje (hoje ainda nao conta contra).
create or replace function public.sequencia_do_usuario(p_uid uuid)
returns integer language sql stable set search_path = public as $$
  with seqs as (select * from public.sequencias_de_estudo(p_uid)),
  ultima as (select d, seq from seqs order by d desc limit 1),
  hoje as (select (now() at time zone 'America/Sao_Paulo')::date as h),
  folgas as (select public.dias_de_folga(p_uid) as f)
  select case
    when (select d from ultima) is null then 0
    when exists (
      select 1 from generate_series((select d from ultima) + 1, (select h from hoje) - 1, interval '1 day') g, folgas
       where extract(dow from g)::integer <> all(folgas.f)) then 0
    else (select seq from ultima)
  end;
$$;

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

CREATE OR REPLACE FUNCTION public.xp_com_bonus(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_base  integer := 0;
  v_total numeric := 0;
  v_fraca text;
begin
  select coalesce(sum(xp), 0) into v_base
  from public.sessoes_estudo where usuario_id = p_uid;

  -- A materia de menor dominio, para o 'Alvo Prioritario'.
  select m->>'nome' into v_fraca
  from public.progresso p, jsonb_array_elements(p.materias) m
  where p.usuario_id = p_uid
  order by coalesce((m->>'progresso')::numeric, 0) asc
  limit 1;

  -- 04/10/2026 (GAM-04): a sequencia de cada dia com a folga da rotina como ponte
  with sequencias as (
    select q.d, q.seq from public.sequencias_de_estudo(p_uid) q
  ),
  por_dia as (
    select (criado_em at time zone 'America/Sao_Paulo')::date as d,
           sum(segundos) / 3600.0 as horas,
           count(distinct materia) filter (where materia is not null) as materias
    from public.sessoes_estudo where usuario_id = p_uid group by 1
  )
  select coalesce(sum(
    -- 03/10/2026 (GAM-01): as especializacoes e a "materia mais fraca" sao as
    -- GRAVADAS NA SESSAO (do momento em que ela entrou), nao as de hoje.
    s.xp * (1 + public.bonus_gravado(
      s.habilidades,
      s.regra_bonus,
      s.segundos / 60.0,
      coalesce(sq.seq, 0),
      pd.horas,
      pd.materias::integer,
      s.alvo
    ))
  ), 0) into v_total
  from public.sessoes_estudo s
  -- 03/10/2026: dia com menos de 15 min nao entra na sequencia -- a sessao dele
  -- continua valendo XP, so sem o bonus de sequencia (left join, seq 0).
  left join sequencias sq on sq.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  join por_dia   pd on pd.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  where s.usuario_id = p_uid;

  return jsonb_build_object(
    'base',     v_base,
    'comBonus', floor(v_total)::integer,
    'pontos',   public.pontos_de_habilidade(v_base),
    'materiaMaisFraca', v_fraca
  );
end;
$function$;
