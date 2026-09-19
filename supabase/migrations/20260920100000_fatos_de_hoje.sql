-- ═══════════════════════════════════════════════════════════════════════════
-- OS FATOS DE HOJE — o que as missões diárias precisam saber
--
-- Parte do R12 (missões) do historico/roadmap-rpg.md. Pedido dele em 18/09:
-- "vamos pensar em missões, tanto missões gerais como missões diárias, todo
--  bom RPG tem missões diárias".
--
-- ── POR QUE UMA CONSULTA NOVA, e nao reusar os fatos que ja existem ───────
-- `fatos_do_usuario` devolve a VIDA INTEIRA: total de sessoes, maior sessao,
-- dias estudados. Serve para condecoracao, que e retrospectiva -- reconhece o
-- que a pessoa ja fez.
--
-- Missao diaria e o oposto: e prospectiva, proposta ANTES, e so fala de HOJE.
-- "Estude 25 minutos hoje" precisa dos minutos de hoje, e nenhum numero da
-- outra funcao responde isso. Somar tudo e dividir nao ajuda: media nao e dia.
--
-- ── O FUSO, de novo, e nao e preciosismo ─────────────────────────────────
-- "Hoje" e no fuso de quem estuda. Uma sessao das 22h no Brasil ja e o dia
-- seguinte em UTC -- e a missao diaria dessa pessoa apareceria cumprida no dia
-- errado, ou pior, zeraria no meio da noite enquanto ela ainda esta estudando.
--
-- ── E A SEMANA, para a missao que atravessa dias ─────────────────────────
-- Algumas missoes gerais pedem constancia dentro da semana corrente. A semana
-- comeca na segunda (padrao ISO, que e o `date_trunc('week')` do Postgres).

create or replace function public.fatos_de_hoje()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hoje date;

  v_sessoes     integer := 0;
  v_minutos     integer := 0;
  v_materias    integer := 0;
  v_maior       integer := 0;
  v_cedo        integer := 0;   -- sessoes antes das 9h
  v_tarde       integer := 0;   -- sessoes depois das 20h
  v_nomes       jsonb   := '[]'::jsonb;
  v_modos       jsonb   := '{}'::jsonb;

  v_dias_semana integer := 0;
  v_min_semana  integer := 0;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  v_hoje := (now() at time zone 'America/Sao_Paulo')::date;

  select
    count(*),
    coalesce(sum(segundos), 0) / 60,
    count(distinct materia) filter (where materia is not null),
    coalesce(max(segundos), 0) / 60,
    count(*) filter (where extract(hour from criado_em at time zone 'America/Sao_Paulo') < 9),
    count(*) filter (where extract(hour from criado_em at time zone 'America/Sao_Paulo') >= 20)
  into v_sessoes, v_minutos, v_materias, v_maior, v_cedo, v_tarde
  from public.sessoes_estudo
  where usuario_id = v_uid
    and (criado_em at time zone 'America/Sao_Paulo')::date = v_hoje;

  -- Os NOMES das materias de hoje, para a missao que pede uma materia
  -- especifica ("estude Matematica hoje") saber se foi cumprida.
  select coalesce(jsonb_agg(distinct materia), '[]'::jsonb) into v_nomes
  from public.sessoes_estudo
  where usuario_id = v_uid and materia is not null
    and (criado_em at time zone 'America/Sao_Paulo')::date = v_hoje;

  select coalesce(jsonb_object_agg(modo, n), '{}'::jsonb) into v_modos
  from (
    select modo, count(*) as n from public.sessoes_estudo
    where usuario_id = v_uid
      and (criado_em at time zone 'America/Sao_Paulo')::date = v_hoje
    group by 1
  ) m;

  -- A semana corrente, para as missoes que atravessam dias.
  select
    count(distinct (criado_em at time zone 'America/Sao_Paulo')::date),
    coalesce(sum(segundos), 0) / 60
  into v_dias_semana, v_min_semana
  from public.sessoes_estudo
  where usuario_id = v_uid
    and criado_em >= date_trunc('week', now() at time zone 'America/Sao_Paulo');

  return jsonb_build_object(
    -- A data vai junto de propósito: e ela que semeia o sorteio das missoes do
    -- dia no navegador. Mandar do servidor garante que a virada de dia acontece
    -- no MESMO instante para o sorteio e para a contagem -- se o navegador
    -- usasse o relogio dele, um aparelho com a hora errada veria as missoes de
    -- ontem marcadas como cumpridas pelo estudo de hoje.
    'data',            to_char(v_hoje, 'YYYY-MM-DD'),
    'sessoes',         v_sessoes,
    'minutos',         v_minutos,
    'materias',        v_materias,
    'materiasNomes',   v_nomes,
    'maiorSessaoMin',  v_maior,
    'antesDas9',       v_cedo,
    'depoisDas20',     v_tarde,
    'porModo',         v_modos,
    'semana', jsonb_build_object(
      'dias',    v_dias_semana,
      'minutos', v_min_semana
    )
  );
end;
$$;

comment on function public.fatos_de_hoje() is
  'O que aconteceu HOJE, no fuso de quem estuda -- base das missoes diarias. '
  'Separado de fatos_do_usuario porque condecoracao olha a vida inteira e '
  'missao diaria olha o dia. Ver historico/roadmap-rpg.md, R12.';

revoke all on function public.fatos_de_hoje() from public, anon;
grant execute on function public.fatos_de_hoje() to authenticated;
