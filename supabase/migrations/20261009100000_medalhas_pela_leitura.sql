-- ============================================================================
-- As medalhas contam as materias da LEITURA do edital (09/10/2026)
-- Auditoria GAM-06, roadmap 3.12 -- decisao dele (opcao 1): "medalhas usam a leitura da IA".
--
-- O QUE ESTAVA ERRADO: a lista de materias que entra nas medalhas era a do navegador.
-- A conta "farm" gravou um edital de 1 materia: Doutrina 56, Amplitude 100 e tres
-- condecoracoes caiu. Desde o 3.3 o aluno pode TIRAR materia da leitura (para corrigir a
-- IA) -- e tirar materia era o proprio atalho.
--
-- O QUE PASSA A HAVER:
--   - progresso.edital_lido: o hash da leitura, gravado pelo SERVIDOR (processar-edital),
--     nunca pelo navegador (a coluna nao tem permissao de escrita para o aluno). O
--     edital->>'hash' continua existindo, mas o aluno escreve nele.
--   - progresso.materias_renomeadas: { hash: { nome lido (minusculo): nome atual } },
--     escrito so por renomear_materias. Renomear nao e tirar.
--   - materias_para_medalhas(): a lista do aluno + as materias da leitura que ele TIROU
--     (com o dominio de verdade de cada uma, 'tirada': true). Sem leitura guardada, e a
--     lista do aluno, como antes.
--   - fatos_do_usuario e ficha_do_usuario usam essa lista (dominio minimo, no teto, menos
--     estudada, Doutrina, Amplitude, condicoes de materia). O CRONOGRAMA continua com a
--     lista do aluno: tirar a materia muda o plano, nao as condecoracoes.
-- ============================================================================

alter table public.progresso add column if not exists edital_lido text;
alter table public.progresso add column if not exists materias_renomeadas jsonb not null default '{}'::jsonb;
comment on column public.progresso.edital_lido is
  'hash (editais_lidos) da ultima leitura entregue a esta conta -- gravado pelo processar-edital, nunca pelo navegador (GAM-06).';
comment on column public.progresso.materias_renomeadas is
  'por leitura: { nome lido em minusculas: nome atual } -- so renomear_materias escreve (GAM-06).';
-- As permissoes do aluno em progresso sao POR COLUNA: as duas novas nascem sem nenhuma.

create or replace function public.mapa_renomeado(p_mapa jsonb, p_trocas jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_mapa jsonb := coalesce(p_mapa, '{}'::jsonb);
  t jsonb;
  achou boolean;
begin
  for t in select * from jsonb_array_elements(coalesce(p_trocas, '[]'::jsonb)) loop
    -- quem ja tinha sido renomeado para o nome antigo segue para o novo (A -> B -> C)
    select bool_or(lower(v) = lower(t->>'de')) into achou from jsonb_each_text(v_mapa) as e(k, v);
    if coalesce(achou, false) then
      select coalesce(jsonb_object_agg(k, case when lower(v) = lower(t->>'de') then t->>'para' else v end), '{}'::jsonb)
        into v_mapa from jsonb_each_text(v_mapa) as e(k, v);
    else
      v_mapa := v_mapa || jsonb_build_object(lower(btrim(t->>'de')), t->>'para');
    end if;
  end loop;
  return v_mapa;
end $$;

create or replace function public.materias_para_medalhas()
returns jsonb language sql stable security definer set search_path = public as $$
  with p as (
    select coalesce(materias, '[]'::jsonb) as materias, edital_lido,
           coalesce(materias_renomeadas -> edital_lido, '{}'::jsonb) as ren
      from public.progresso where usuario_id = auth.uid()
  ),
  lidas as (
    select btrim(m->>'nome') as nome
      from p
      join public.editais_lidos e on e.hash = p.edital_lido,
      jsonb_array_elements(coalesce(e.resultado->'materias', '[]'::jsonb)) m
     where coalesce(btrim(m->>'nome'), '') <> ''
  ),
  tiradas as (
    -- o nome ATUAL de cada materia lida (renomeada ou nao) que nao esta mais na lista do aluno
    select distinct coalesce(p.ren->>lower(l.nome), l.nome) as nome
      from lidas l, p
     where not exists (
       select 1 from jsonb_array_elements(p.materias) a
        where lower(btrim(a->>'nome')) = lower(coalesce(p.ren->>lower(l.nome), l.nome)))
  )
  select p.materias || coalesce(
           public.dominio_calculado(auth.uid(),
             (select jsonb_agg(jsonb_build_object('nome', t.nome, 'peso', 0, 'tirada', true)) from tiradas t)),
           '[]'::jsonb)
    from p;
$$;
revoke all on function public.materias_para_medalhas() from public, anon;
grant execute on function public.materias_para_medalhas() to authenticated;
revoke all on function public.mapa_renomeado(jsonb, jsonb) from public, anon, authenticated;

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
        from public.progresso p, jsonb_array_elements(public.materias_para_medalhas()) m
        where p.usuario_id = v_uid), 0),
      'dominioMenosEstudada', coalesce(v_menos_estudada, 0),
      'materias',         coalesce(public.materias_para_medalhas(), '[]'::jsonb),
      'atributos',        v_ficha->'atributos'
    );
end;
$function$;

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
    from public.progresso p, jsonb_array_elements(public.materias_para_medalhas()) m
   where p.usuario_id = v_uid and coalesce(m->>'nome', '') <> '';

  select
    -- 03/10/2026: dia ESTUDADO = 15 min no dia (dias_de_estudo), decisao dele.
    (select count(*) from public.dias_de_estudo(v_uid) x
      where x > (now() at time zone 'America/Sao_Paulo')::date - 30),
    -- 03/10/2026 (NUM-01): so materia do EDITAL ATUAL conta (com edital).
    -- Antes contava qualquer uma -- "9 de 4 do edital" = 100. Sem edital,
    -- conta as estudadas, menos "Geral" (tempo sem materia nao e materia).
    count(distinct lower(materia))
      filter (where dia > (now() at time zone 'America/Sao_Paulo')::date - 30 and materia is not null
                and lower(materia) <> 'geral'
                and (v_nomes_edital is null or lower(materia) = any (v_nomes_edital))),
    coalesce(max(segundos) filter (where criado_em >= now() - interval '90 days' and modo in ('livre', 'pomodoro')), 0) / 60,
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
    coalesce(jsonb_array_length(public.materias_para_medalhas()), 0),
    coalesce((
      select avg(greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0))))
      from jsonb_array_elements(public.materias_para_medalhas()) m
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

CREATE OR REPLACE FUNCTION public.renomear_materias(p_trocas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_lista jsonb;
  v_trocas jsonb := '[]'::jsonb;
  t jsonb;
  v_de text;
  v_para text;
  v_sessoes integer := 0;
  v_recursos integer := 0;
  n integer;
begin
  if v_uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  if jsonb_typeof(p_trocas) <> 'array' or jsonb_array_length(p_trocas) > 40 then
    raise exception 'Lista de trocas invalida.' using errcode = '22023';
  end if;

  select materias into v_lista from public.progresso where usuario_id = v_uid;
  v_lista := coalesce(v_lista, '[]'::jsonb);

  -- 1. conferir TODAS antes de mexer em qualquer uma
  for t in select * from jsonb_array_elements(p_trocas) loop
    v_de := t->>'de';
    v_para := btrim(coalesce(t->>'para', ''));
    if v_de is null or v_de = v_para then continue; end if;
    if char_length(v_para) < 1 or char_length(v_para) > 120 then
      raise exception 'O nome da materia precisa ter de 1 a 120 letras.' using errcode = '22023';
    end if;
    if not exists (select 1 from jsonb_array_elements(v_lista) m where m->>'nome' = v_de) then
      raise exception 'A materia "%" nao esta no seu edital.', v_de using errcode = '22023';
    end if;
    -- nome de OUTRA materia do edital (inclusive uma que tambem vai ser renomeada:
    -- troca cruzada de nomes fica para duas correcoes)
    if exists (select 1 from jsonb_array_elements(v_lista) m
                where m->>'nome' <> v_de
                  and lower(unaccent_simples(m->>'nome')) = lower(unaccent_simples(v_para))) then
      raise exception 'Ja existe outra materia chamada "%" no seu edital.', v_para using errcode = '22023';
    end if;
    -- estudo ja gravado com esse nome em outra materia: juntar duas materias
    -- inflaria "a mesma materia N dias seguidos"
    if exists (select 1 from public.sessoes_estudo s
                where s.usuario_id = v_uid and s.materia <> v_de
                  and lower(unaccent_simples(s.materia)) = lower(unaccent_simples(v_para))) then
      raise exception 'Voce ja tem estudo gravado como "%" em outra materia.', v_para using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(v_trocas) o
                where o->>'de' = v_de
                   or lower(unaccent_simples(o->>'para')) = lower(unaccent_simples(v_para))) then
      raise exception 'Duas trocas com o mesmo nome: "%".', v_para using errcode = '22023';
    end if;
    v_trocas := v_trocas || jsonb_build_array(jsonb_build_object('de', v_de, 'para', v_para));
  end loop;

  if jsonb_array_length(v_trocas) = 0 then
    return jsonb_build_object('trocas', 0, 'sessoes', 0, 'recursos', 0);
  end if;

  -- 2. aplicar
  for t in select * from jsonb_array_elements(v_trocas) loop
    update public.sessoes_estudo set materia = t->>'para'
     where usuario_id = v_uid and materia = t->>'de';
    get diagnostics n = row_count;
    v_sessoes := v_sessoes + n;

    update public.recursos_salvos r set materia = t->>'para'
     where r.usuario_id = v_uid and r.materia = t->>'de'
       and not exists (select 1 from public.recursos_salvos o
                        where o.usuario_id = v_uid and o.materia = t->>'para');
    get diagnostics n = row_count;
    v_recursos := v_recursos + n;
  end loop;

  update public.progresso p set materias = (
    select coalesce(jsonb_agg(
             case when tr.para is not null then m || jsonb_build_object('nome', tr.para) else m end
             order by x.ord), '[]'::jsonb)
      from jsonb_array_elements(p.materias) with ordinality as x(m, ord)
      left join lateral (
        select o->>'para' as para from jsonb_array_elements(v_trocas) o
         where o->>'de' = x.m->>'nome' limit 1) tr on true)
   where p.usuario_id = v_uid;

  -- 09/10/2026 (GAM-06): guarda a renomeacao, por leitura do edital -- para "Portugues" virar
  -- "Lingua Portuguesa" nao parecer, para as medalhas, que a materia foi TIRADA.
  update public.progresso p
     set materias_renomeadas = jsonb_set(coalesce(p.materias_renomeadas, '{}'::jsonb),
           array[coalesce(p.edital_lido, 'sem-leitura')],
           public.mapa_renomeado(coalesce(p.materias_renomeadas -> coalesce(p.edital_lido, 'sem-leitura'), '{}'::jsonb), v_trocas))
   where p.usuario_id = v_uid;

  return jsonb_build_object('trocas', jsonb_array_length(v_trocas), 'sessoes', v_sessoes, 'recursos', v_recursos);
end;
$function$;
