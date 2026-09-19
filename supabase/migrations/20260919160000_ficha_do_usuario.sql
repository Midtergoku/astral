-- ═══════════════════════════════════════════════════════════════════════════
-- A FICHA — os atributos do personagem, calculados pelo SERVIDOR
--
-- Ordem do Lucas em 17/09/2026: "quero que se torne um RPG". O item R1 do
-- historico/roadmap-rpg.md: cinco atributos no lugar de um XP so.
--
-- ── POR QUE ISTO MORA NO BANCO, E NAO NO NAVEGADOR ─────────────────────────
-- Porque resolve DUAS coisas de uma vez, e a segunda e a que importa.
--
-- 1. E a ficha do RPG: DISCIPLINA, RESISTENCIA, AMPLITUDE, DOUTRINA, PRECISAO.
-- 2. E o comeco do anti-fraude (R0). Medido em 17/09 com tools/testa-xp-forjado.js:
--    hoje o navegador INFORMA o XP, e da para escrever 999.999.999 -- de forma
--    PERMANENTE, porque salvar_progresso guarda sempre o maior valor.
--
--    Um atributo CALCULADO a partir de registros nao pode ser informado. Nao ha
--    campo para preencher: o numero sai da conta. Esconder o calculo no
--    navegador nao adiantaria nada -- o que o navegador calcula, a pessoa
--    calcula, e o pedido pode ser editado direto na aba de rede. A unica
--    pergunta que vale e QUEM DECIDE o valor, e a resposta passa a ser: o
--    servidor.
--
-- ── A MATERIA-PRIMA JA EXISTIA ─────────────────────────────────────────────
-- `sessoes_estudo` grava materia, segundos, xp, modo e data de CADA sessao
-- desde 30/07/2026. Nao foi preciso coletar nada novo.
--
-- 🔴 Com uma correcao que teve de vir antes (R0.1, em 19/09): ate ontem SO o
-- cronometro gravava sessao. Marcar a sessao do dia -- o caminho principal --
-- nao gravava nada. Sem aquele conserto, esta funcao devolveria ficha ZERADA
-- para quem estuda pelo cronograma, e trocar o XP por ela APAGARIA o progresso
-- dessas pessoas. Foi o Lucas quem apontou o buraco.
--
-- ── AS ESCOLHAS DE CALCULO, e por que cada uma ─────────────────────────────
--
-- JANELA DE 30 DIAS para DISCIPLINA e AMPLITUDE. Estes dois medem HABITO, que
-- e estado atual, nao recorde. Quem estudou muito ha seis meses e parou nao e
-- disciplinado hoje -- e foi. Usar a vida inteira transformaria a ficha num
-- trofeu que nunca desce, e um numero que so sobe nao informa nada.
--
-- RESISTENCIA usa 90 DIAS e o MAIOR valor, porque ela mede capacidade, e
-- capacidade a pessoa nao perde em duas semanas de folga.
--
-- OS TETOS SAO METAS REALISTAS, nao o infinito:
--   20 dias de estudo em 30  = 100 de disciplina (~5 dias por semana)
--   90 minutos numa sessao   = 100 de resistencia
--   todas as materias do edital tocadas no mes = 100 de amplitude
-- Teto alto demais faz todo mundo parecer ruim; teto baixo demais faz o
-- atributo parar de crescer cedo e virar decoracao.
--
-- PRECISAO VOLTA NULL, de proposito. Ela depende do banco de questoes, que
-- ainda nao existe. Inventar um numero aqui seria a pior coisa que este
-- arquivo poderia fazer: a ficha inteira perderia credito por causa de um
-- atributo decorativo. Null e a tela mostra "ainda nao ha o que medir".
--
-- XP MEDIDO x DECLARADO vem SEPARADO, e nao somado. livre/pomodoro e tempo que
-- o relogio contou; cronograma e tempo que a pessoa afirmou. Sao graus de
-- confianca diferentes. Somar os dois jogaria fora justamente a informacao que
-- o R0 vai precisar para decidir quanto vale cada um -- e essa decisao e do
-- Lucas, nao minha.
--
-- ⚠️ `security invoker`: a funcao roda com a identidade de quem chamou, entao
-- a RLS de sessoes_estudo e progresso continua valendo. Ninguem le a ficha de
-- outra pessoa por aqui. Fosse `security definer`, esta funcao viraria um
-- buraco que devolve dado alheio.

create or replace function public.ficha_do_usuario()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_dias_no_mes     integer := 0;   -- dias distintos com sessao, ultimos 30
  v_materias_no_mes integer := 0;   -- materias distintas, ultimos 30
  v_maior_sessao    integer := 0;   -- minutos da maior sessao, ultimos 90
  v_horas_total     numeric := 0;
  v_sessoes_total   integer := 0;
  v_xp_medido       integer := 0;
  v_xp_declarado    integer := 0;

  v_materias_edital integer := 0;
  v_dominio_medio   numeric := 0;
  v_streak          integer := 0;
  v_xp_guardado     integer := 0;

  v_disciplina  integer := 0;
  v_resistencia integer := 0;
  v_amplitude   integer := 0;
  v_doutrina    integer := 0;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login para ver a ficha.'
      using errcode = '28000';
  end if;

  -- ── O que as sessoes dizem ────────────────────────────────────────────────
  select
    count(distinct (criado_em at time zone 'America/Sao_Paulo')::date)
      filter (where criado_em >= now() - interval '30 days'),
    count(distinct materia)
      filter (where criado_em >= now() - interval '30 days' and materia is not null),
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

  -- ── O que o progresso diz ─────────────────────────────────────────────────
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

  -- Conta nova, sem linha em progresso: tudo zero, e a ficha ainda responde.
  v_streak          := coalesce(v_streak, 0);
  v_xp_guardado     := coalesce(v_xp_guardado, 0);
  v_materias_edital := coalesce(v_materias_edital, 0);
  v_dominio_medio   := coalesce(v_dominio_medio, 0);

  -- ── Os atributos ──────────────────────────────────────────────────────────

  -- DISCIPLINA: aparecer, e aparecer de novo. Dois tercos vem da constancia do
  -- mes e um terco da sequencia atual -- a sequencia sozinha premiaria demais
  -- quem esta no quarto dia e puniria demais quem faltou ontem depois de um
  -- mes inteiro de estudo.
  v_disciplina := least(100, round(
      (least(1.0, v_dias_no_mes / 20.0) * 66)
    + (least(1.0, v_streak / 7.0) * 34)
  ));

  -- RESISTENCIA: aguentar sentado. So a maior sessao importa -- e capacidade,
  -- nao media.
  v_resistencia := least(100, round(least(1.0, v_maior_sessao / 90.0) * 100));

  -- AMPLITUDE: nao abandonar materia. Com edital, a base e o numero de materias
  -- dele; sem edital, uso 5 como base razoavel para um concurso militar.
  v_amplitude := least(100, round(
    case
      when v_materias_edital > 0 then least(1.0, v_materias_no_mes::numeric / v_materias_edital)
      else least(1.0, v_materias_no_mes / 5.0)
    end * 100
  ));

  -- DOUTRINA: o quanto ja domina. Vem direto do progresso por materia.
  v_doutrina := least(100, greatest(0, round(v_dominio_medio)));

  return jsonb_build_object(
    'atributos', jsonb_build_object(
      'disciplina',  jsonb_build_object(
        'valor', v_disciplina,
        'porque', format('%s dia(s) de estudo nos ultimos 30, sequencia de %s', v_dias_no_mes, v_streak)),
      'resistencia', jsonb_build_object(
        'valor', v_resistencia,
        'porque', format('maior sessao: %s min', v_maior_sessao)),
      'amplitude',   jsonb_build_object(
        'valor', v_amplitude,
        'porque', format('%s materia(s) tocada(s) no mes de %s do edital', v_materias_no_mes, v_materias_edital)),
      'doutrina',    jsonb_build_object(
        'valor', v_doutrina,
        'porque', format('dominio medio de %s%%', round(v_dominio_medio))),
      -- 🔴 NULL de proposito -- ver o cabecalho. Nao inventar numero aqui.
      'precisao',    jsonb_build_object(
        'valor', null,
        'porque', 'depende do banco de questoes, que ainda nao existe')
    ),
    'sessoes', jsonb_build_object(
      'total', v_sessoes_total,
      'horas', round(v_horas_total, 1),
      'dias_no_mes', v_dias_no_mes,
      'maior_sessao_min', v_maior_sessao
    ),
    -- O XP honesto, ao lado do guardado. Ainda NAO substitui nada: serve para
    -- comparar e decidir o R0 com numero na mao, em vez de palpite.
    'xp', jsonb_build_object(
      'medido',    v_xp_medido,
      'declarado', v_xp_declarado,
      'somado',    v_xp_medido + v_xp_declarado,
      'guardado',  v_xp_guardado
    )
  );
end;
$$;

comment on function public.ficha_do_usuario() is
  'A ficha do RPG: 5 atributos derivados de sessoes_estudo e progresso. '
  'Calculada no servidor de proposito -- atributo derivado nao pode ser '
  'informado pelo navegador. Ver historico/roadmap-rpg.md, R0 e R1.';

revoke all on function public.ficha_do_usuario() from public, anon;
grant execute on function public.ficha_do_usuario() to authenticated;
