-- ═══════════════════════════════════════════════════════════════════════════
-- OS FATOS — tudo o que as condecoracoes precisam saber, calculado no servidor
--
-- Parte do R13 (motor de condecoracoes) do historico/roadmap-rpg.md.
--
-- ── A DECISAO DE ARQUITETURA, e ela merece explicacao ──────────────────────
--
-- O catalogo tem 74 condecoracoes e mora em `assets/js/catalogo.js`, porque o
-- Lucas vai mexer nele MUITO -- ja dobrou de tamanho no dia em que nasceu.
-- Traduzir as 74 condicoes para SQL criaria duas copias do mesmo catalogo, e
-- duas copias divergem: e questao de tempo ate uma medalha existir na tela e
-- nao existir no banco.
--
-- Entao a divisao e outra, e ela separa o que NAO pode ser forjado do que nao
-- precisa ser protegido:
--
--   SERVIDOR (aqui)   os FATOS -- "estudou 47 dias, maior sessao 92 min,
--                     dominio minimo 38%". Vem de sessoes_estudo e progresso,
--                     com RLS. O navegador nao tem como inventar nenhum.
--
--   NAVEGADOR         comparar fato com condicao -- "47 >= 30, logo ganhou".
--                     E aritmetica pura sobre numeros que ele nao escolheu.
--
-- ⚠️ E POR QUE NADA E GRAVADO: a lista de condecoracoes e uma FUNCAO PURA dos
-- fatos. Recalcular a cada abertura da tela da sempre a mesma resposta, entao
-- nao ha estado para guardar -- e o que nao se guarda nao se falsifica. Isto
-- resolve de graca o furo que medi em 17/09, quando gravei a conquista
-- `conquista_que_nao_existe` no `badges` do progresso e o banco aceitou.
--
-- 🔴 O LIMITE HONESTO: alguem que edite o proprio navegador consegue se MOSTRAR
-- uma medalha que nao ganhou. Nao ha estado, nao ha efeito sobre ninguem, e
-- nada e gravado -- e autoengano puro, do mesmo tipo do XP de hoje. Isso deixa
-- de ser aceitavel no dia em que condecoracao destrancar conteudo do Pro; ai a
-- comparacao sobe para o servidor tambem, e ai vale a pena pagar o preco de ter
-- o catalogo em dois lugares. Hoje nao vale.

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

  v_streak         integer := 0;
  v_xp             integer := 0;
  v_tem_edital     boolean := false;
  v_dominio_min    numeric := 0;
  v_menos_estudada numeric := 0;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  -- ── Totais simples ────────────────────────────────────────────────────────
  select count(*), coalesce(sum(segundos), 0) / 3600.0,
         coalesce(sum(xp), 0), coalesce(max(segundos), 0) / 60
  into v_sessoes, v_horas, v_xp_sessoes, v_maior_sessao
  from public.sessoes_estudo where usuario_id = v_uid;

  -- ── Por dia: quantos dias, e o melhor dia ────────────────────────────────
  -- O fuso importa: "estudou dia 3" e no fuso da pessoa, nao em UTC. Sem isto
  -- uma sessao das 22h no Brasil contaria no dia seguinte.
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

  -- ── Semanas perfeitas: 7 dias distintos dentro da mesma semana ───────────
  with por_semana as (
    select date_trunc('week', criado_em at time zone 'America/Sao_Paulo') as semana,
           count(distinct (criado_em at time zone 'America/Sao_Paulo')::date) as dias
    from public.sessoes_estudo where usuario_id = v_uid group by 1
  )
  select count(*) into v_semanas_perf from por_semana where dias >= 7;

  -- ── A MESMA materia N dias seguidos ──────────────────────────────────────
  -- Truque classico de ilha: numa sequencia de datas consecutivas, a diferenca
  -- entre a data e a posicao dela na ordem e constante. Agrupar por essa
  -- constante isola cada corrida sem laco nenhum.
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

  -- ── Maior volta por cima: o maior intervalo entre dois dias estudados ────
  -- So conta se houve estudo DEPOIS do sumico -- e por isso que a conta e
  -- sobre a diferenca entre dias consecutivos, e nao entre o ultimo dia e hoje.
  with dias as (
    select distinct (criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.sessoes_estudo where usuario_id = v_uid
  ),
  saltos as (
    select dia - lag(dia) over (order by dia) as intervalo from dias
  )
  select coalesce(max(intervalo), 0) into v_retorno from saltos;

  -- ── Horario e dia da semana, em vetores ──────────────────────────────────
  -- Vetor em vez de linha por linha: a condicao pergunta "quantas entre 4h e
  -- 6h", e somar um pedaco do vetor e mais barato que consultar de novo.
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

  -- ── O que vem do progresso ───────────────────────────────────────────────
  select p.streak, p.xp, (p.edital is not null),
         coalesce((select min(greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0))))
                   from jsonb_array_elements(p.materias) m), 0)
  into v_streak, v_xp, v_tem_edital, v_dominio_min
  from public.progresso p where p.usuario_id = v_uid;

  -- ── A materia MENOS estudada: qual o dominio dela? ───────────────────────
  -- Usada pela "Virada de Jogo". So faz sentido com pelo menos duas materias
  -- estudadas -- com uma so, a menos estudada e a unica, e a medalha cairia de
  -- graca junto com a primeira materia dominada.
  select coalesce((
    select greatest(0, least(100, coalesce((m->>'progresso')::numeric, 0)))
    from jsonb_array_elements((select materias from public.progresso where usuario_id = v_uid)) m
    join (
      select materia, sum(segundos) as total
      from public.sessoes_estudo
      where usuario_id = v_uid and materia is not null
      group by 1
      having count(distinct materia) >= 0
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
      'streak',           coalesce(v_streak, 0),
      'xp',               coalesce(v_xp, 0),
      'temEdital',        coalesce(v_tem_edital, false),
      'dominioMinimo',    coalesce(v_dominio_min, 0),
      'dominioMenosEstudada', coalesce(v_menos_estudada, 0),
      'materias',         coalesce((select materias from public.progresso where usuario_id = v_uid), '[]'::jsonb),
      'atributos',        v_ficha->'atributos'
    );
end;
$$;

comment on function public.fatos_do_usuario() is
  'Os fatos que as condecoracoes conferem: totais, constancia, horarios, '
  'dominio. Tudo derivado de sessoes_estudo e progresso, com RLS -- o '
  'navegador nao inventa nenhum. Ver historico/roadmap-rpg.md, R13.';

revoke all on function public.fatos_do_usuario() from public, anon;
grant execute on function public.fatos_do_usuario() to authenticated;
