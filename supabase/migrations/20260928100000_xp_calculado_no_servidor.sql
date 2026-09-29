-- ============================================================================
-- O XP, AS HORAS E A SEQUENCIA PASSAM A SER DO SERVIDOR
--
-- Pedido dele em 27/09/2026: "se certifique de que ninguem pode fazer isso de
-- dar acesso a tudo, acredito que so nos podemos". Autorizado em 28/09.
--
-- ── O QUE ESTAVA ABERTO (medido em producao, 27/09) ─────────────────────────
-- 1. `sessoes_estudo` aceitava do navegador QUALQUER `xp` e QUALQUER
--    `criado_em`: grant de insert nas duas colunas, sem gatilho, sem teto.
--    Ficha, patente, pontos de habilidade e conquistas saem dessas sessoes --
--    quem gravasse "estudei 900 horas desde o ano passado" ganhava tudo.
-- 2. `progresso.xp`, `streak` e `horas` eram o numero que o navegador mandava,
--    e `salvar_progresso` guarda sempre o MAIOR: forjado uma vez, para sempre.
--    A patente do topo e a sequencia (usada por conquistas) vinham dali.
--
-- ── O CONSERTO: quem decide o valor e o servidor ────────────────────────────
-- Nenhum grant muda. O navegador continua mandando o que manda hoje -- e o
-- gatilho SOBRESCREVE com o valor calculado. Assim nenhuma tela quebra, e o
-- numero do navegador simplesmente deixa de valer.
--
-- Sessao (gatilho antes de inserir):
--   - `criado_em` = agora. Nao existe sessao no passado.
--   - `xp` pela MESMA regra da tela: cronometro 2 por minuto (cronometro.html);
--     cronograma meio por minuto, minimo 10 (plano.js).
--   - Sessao MEDIDA (livre/pomodoro) nao pode ser mais longa que o tempo que
--     passou desde a sessao medida anterior (ou desde a criacao da conta),
--     com 2 min de folga para o relogio do aparelho.
--   - Sessao DECLARADA (cronograma) ate 4 h cada, ate 12 h declaradas por dia.
--     Quem nao usa o cronometro -- e ele lembrou que muitos nao usam -- marca
--     o cronograma e continua ganhando, so nao ganha o infinito.
--
-- Progresso (gatilho antes de gravar): xp, horas e sequencia recalculados das
-- sessoes, sempre. O que chegou do navegador e ignorado.
--
-- 🔑 A CHAVE DE SERVICO FICA DE FORA, de proposito: e com ela que os testes
-- semeiam historico e que `tools/simula-edital.js` monta a conta de teste do
-- dono. "So nos podemos" -- e so nos temos essa chave.
--
-- ⚠️ O QUE CONTINUA DECLARADO, por natureza: o progresso por materia (a
-- pessoa diz quanto domina) e a lista `badges` das missoes antigas do
-- dashboard. Nenhum dos dois libera acesso pago.
--
-- IMPACTO MEDIDO ANTES: 2 contas com progresso, NENHUMA com XP guardado acima
-- do que as proprias sessoes justificam. Ninguem perde patente.
-- ============================================================================

-- Quem esta gravando: 'authenticated'/'anon' = alguem pelo site; qualquer
-- outra coisa (service_role, SQL direto) = nos.
create or replace function public.gravacao_pelo_site()
returns boolean language sql stable set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  ) in ('authenticated', 'anon');
$$;

-- ── 1. A sessao ────────────────────────────────────────────────────────────
create or replace function public.validar_sessao_estudo()
returns trigger language plpgsql security definer set search_path = public as $$
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
$$;

drop trigger if exists sessao_confiavel on public.sessoes_estudo;
create trigger sessao_confiavel
  before insert on public.sessoes_estudo
  for each row execute function public.validar_sessao_estudo();

-- ── 2. Os numeros do progresso ─────────────────────────────────────────────
-- Sequencia: dias seguidos terminando hoje ou ontem (fuso de Sao Paulo).
-- Estudou ate ontem e ainda nao hoje: a sequencia continua viva.
create or replace function public.sequencia_do_usuario(p_uid uuid)
returns integer language sql stable set search_path = public as $$
  with dias as (
    select distinct (criado_em at time zone 'America/Sao_Paulo')::date as d
      from public.sessoes_estudo where usuario_id = p_uid
  ),
  ilhas as (select d, d - (row_number() over (order by d))::integer as ilha from dias),
  ultima as (select max(d) as d from dias)
  select case
    when (select d from ultima) is null then 0
    when (select d from ultima) < (now() at time zone 'America/Sao_Paulo')::date - 1 then 0
    else (select count(*)::integer from ilhas
           where ilha = (select ilha from ilhas where d = (select d from ultima)))
  end;
$$;

create or replace function public.progresso_do_servidor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_xp integer;
begin
  if not public.gravacao_pelo_site() then
    return new;
  end if;
  v_xp := coalesce((public.xp_com_bonus(new.usuario_id) ->> 'comBonus')::integer, 0);
  new.xp          := v_xp;
  new.xp_validado := v_xp;
  new.horas  := round(coalesce((select sum(segundos) from public.sessoes_estudo
                                 where usuario_id = new.usuario_id), 0) / 3600.0, 1);
  new.streak := public.sequencia_do_usuario(new.usuario_id);
  return new;
end;
$$;

drop trigger if exists numeros_do_servidor on public.progresso;
create trigger numeros_do_servidor
  before insert or update on public.progresso
  for each row execute function public.progresso_do_servidor();

-- Ninguem de fora chama estas diretamente: sao engrenagem dos gatilhos.
revoke all on function public.validar_sessao_estudo() from public, anon, authenticated;
revoke all on function public.progresso_do_servidor() from public, anon, authenticated;
revoke all on function public.sequencia_do_usuario(uuid) from public, anon, authenticated;
grant execute on function public.gravacao_pelo_site() to anon, authenticated;

-- Acerta de uma vez as linhas que ja existem (as 2 contas), pelo mesmo calculo.
update public.progresso p set
  xp = coalesce((public.xp_com_bonus(p.usuario_id) ->> 'comBonus')::integer, 0),
  xp_validado = coalesce((public.xp_com_bonus(p.usuario_id) ->> 'comBonus')::integer, 0),
  horas = round(coalesce((select sum(segundos) from public.sessoes_estudo s
                           where s.usuario_id = p.usuario_id), 0) / 3600.0, 1),
  streak = public.sequencia_do_usuario(p.usuario_id);

-- ── 3. A PRECISAO ──────────────────────────────────────────────────────────
-- O quinto atributo da ficha, que esperava o banco de questoes. A regra e
-- "ACERTOU DE PRIMEIRA": das questoes do acervo que a pessoa respondeu,
-- quantas ela acertou na primeira tentativa (vezes_errou = 0).
--
-- Por que de primeira, e nao "acertos / respostas": o caderno de erros deixa
-- responder de novo. Contando toda resposta, bastaria repetir a mesma questao
-- que ja sabe para chegar a 100%. Errou uma vez, ela nunca mais conta como
-- acerto de primeira -- revisar melhora o caderno, nao a precisao.
--
-- So o ACERVO conta: nas questoes que a pessoa subiu, o gabarito e ela quem
-- informa. `respostas` e fechada; esta funcao le so a linha de quem chamou.
create or replace function public.minha_precisao()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'respondidas', count(*),
    'de_primeira', count(*) filter (where vezes_errou = 0))
  from public.respostas
  where usuario_id = auth.uid() and questao_id is not null;
$$;
revoke all on function public.minha_precisao() from public, anon;
grant execute on function public.minha_precisao() to authenticated;

create or replace function public.ficha_do_usuario()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
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
        'porque', format('%s matéria(s) tocada(s) no mês, de %s do edital', v_materias_no_mes, v_materias_edital)),
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
$$;
