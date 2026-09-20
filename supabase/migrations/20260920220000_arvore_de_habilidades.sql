-- ═══════════════════════════════════════════════════════════════════════════
-- A ÁRVORE DE HABILIDADES  (R2)
--
-- Aprovada por ele em 18/09/2026: "a árvore de especialização que a gente chama
-- de árvore de habilidades. Isso é extremamente interessante."
--
-- ── 🔴 A TRAVA QUE ELE MESMO PÔS, E QUE MANDA NO DESENHO INTEIRO ──────────
-- "os ramos mudam COMO se joga, nunca O QUE se aprende."
--
-- Numa arvore de RPG comum, uma escolha ruim deixa o personagem fraco. Aqui
-- isso seria inaceitavel: ninguem pode estudar PIOR por ter gasto um ponto no
-- ramo errado. Entao NENHUMA habilidade aqui tira nada, nem bloqueia nada, nem
-- muda o cronograma. Todas somam bonus de XP sobre um comportamento -- e o
-- pior que uma escolha errada faz e render menos XP do que renderia.
--
-- E por isso o esquecimento e de GRACA (ver `esquecer_habilidades`): punir
-- quem explorou seria punir curiosidade num produto de estudo.
--
-- ── 🔴 A CIRCULARIDADE, e como ela foi cortada ────────────────────────────
-- Os pontos vem da patente, a patente vem do XP, e as habilidades AUMENTAM o
-- XP. Isso e um laco: mais XP -> mais pontos -> mais bonus -> mais XP.
--
-- Corte: os pontos vem do XP BASE -- a soma crua do que as sessoes
-- registraram, sem bonus nenhum. Habilidade nao compra habilidade.
--
--   xp_base      soma de sessoes_estudo.xp            -> gera PONTOS
--   xp_validado  xp_base + bonus das habilidades      -> e o XP que aparece
--
-- ── E A ESCRITA CONTINUA FECHADA ──────────────────────────────────────────
-- Mesma decisao de 20/09: "o servidor vai gravar, nao quero ninguem alterando
-- isso a nao ser nos". A tabela nao da insert/update/delete a ninguem; as
-- unicas portas sao as duas funcoes `security definer` abaixo, e as duas leem
-- o dono de `auth.uid()`, nunca de parametro.

-- ── 1. O CATALOGO DAS HABILIDADES ──────────────────────────────────────────
-- Tabela e nao codigo porque assim pre-requisito e contagem de pontos ficam
-- genericos: acrescentar um degrau e uma linha, nao uma funcao nova.
--
-- `regra` e o unico campo que o codigo interpreta -- ver `bonus_da_sessao`.
create table if not exists public.catalogo_habilidades (
  id         text primary key,
  ramo       text not null check (ramo in ('infantaria', 'artilharia', 'inteligencia')),
  degrau     integer not null check (degrau between 1 and 9),
  nome       text not null,
  descricao  text not null,
  regra      text not null,
  limiar     numeric not null,
  bonus      numeric not null check (bonus > 0 and bonus <= 0.5),
  unique (ramo, degrau)
);

alter table public.catalogo_habilidades enable row level security;
drop policy if exists hab_catalogo_leitura on public.catalogo_habilidades;
create policy hab_catalogo_leitura on public.catalogo_habilidades
  for select to authenticated using (true);
revoke all on public.catalogo_habilidades from anon, authenticated;
grant select on public.catalogo_habilidades to authenticated;

insert into public.catalogo_habilidades (id, ramo, degrau, nome, descricao, regra, limiar, bonus) values
  -- INFANTARIA — constância. O bônus olha a sequência que a pessoa tinha NO DIA
  -- daquela sessão, não a de hoje: quem manteve 30 dias em março ganhou por
  -- março, e não perde isso por ter faltado em abril.
  ('inf_1', 'infantaria', 1, 'Marcha Firme',    'Sessões em dias com 3 ou mais dias seguidos rendem 5% a mais.',  'sequencia',  3,  0.05),
  ('inf_2', 'infantaria', 2, 'Passo Constante', 'Sessões em dias com 7 ou mais dias seguidos rendem 10% a mais.', 'sequencia',  7,  0.10),
  ('inf_3', 'infantaria', 3, 'Pé Firme',        'Sessões em dias com 15 ou mais dias seguidos rendem 15% a mais.','sequencia', 15,  0.15),
  ('inf_4', 'infantaria', 4, 'Inquebrantável',  'Sessões em dias com 30 ou mais dias seguidos rendem 20% a mais.','sequencia', 30,  0.20),

  -- ARTILHARIA — volume. Premia aguentar sentado.
  ('art_1', 'artilharia', 1, 'Carga Dupla',     'Sessões de 40 minutos ou mais rendem 5% a mais.',   'duracao',   40,  0.05),
  ('art_2', 'artilharia', 2, 'Fogo Sustentado', 'Sessões de 60 minutos ou mais rendem 10% a mais.',  'duracao',   60,  0.10),
  ('art_3', 'artilharia', 3, 'Bateria Pesada',  'Sessões de 90 minutos ou mais rendem 15% a mais.',  'duracao',   90,  0.15),
  ('art_4', 'artilharia', 4, 'Barragem',        'Sessões em dias de 3 horas ou mais rendem 20% a mais.', 'horasNoDia', 3, 0.20),

  -- INTELIGENCIA — amplitude e alvo. O ramo que ele chamou de "precisão" vai
  -- ganhar degraus de ACERTO quando o banco de questões existir; até lá, os
  -- degraus são de AMPLITUDE e de ALVO, que é o que os dados de hoje sustentam.
  -- Prometer um degrau de acerto agora seria um degrau que nunca dispara.
  ('int_1', 'inteligencia', 1, 'Reconhecimento', 'Sessões em dias com 2 ou mais matérias rendem 5% a mais.',  'materiasNoDia', 2, 0.05),
  ('int_2', 'inteligencia', 2, 'Mapa Completo',  'Sessões em dias com 3 ou mais matérias rendem 10% a mais.', 'materiasNoDia', 3, 0.10),
  ('int_3', 'inteligencia', 3, 'Rodízio',        'Sessões em dias com 4 ou mais matérias rendem 15% a mais.', 'materiasNoDia', 4, 0.15),
  -- 🎯 O degrau mais útil da árvore inteira: paga mais para estudar a matéria
  -- em que você está pior, que é exatamente o que a maioria evita fazer.
  ('int_4', 'inteligencia', 4, 'Alvo Prioritário','Sessões da sua matéria de menor domínio rendem 20% a mais.','materiaMaisFraca', 0, 0.20)
on conflict (id) do update set
  ramo = excluded.ramo, degrau = excluded.degrau, nome = excluded.nome,
  descricao = excluded.descricao, regra = excluded.regra,
  limiar = excluded.limiar, bonus = excluded.bonus;

-- ── 2. AS ESCOLHAS ─────────────────────────────────────────────────────────
create table if not exists public.habilidades_escolhidas (
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  habilidade_id text not null references public.catalogo_habilidades(id),
  escolhida_em  timestamptz not null default now(),
  primary key (usuario_id, habilidade_id)
);

alter table public.habilidades_escolhidas enable row level security;
drop policy if exists hab_escolhidas_leitura on public.habilidades_escolhidas;
create policy hab_escolhidas_leitura on public.habilidades_escolhidas
  for select to authenticated using (usuario_id = auth.uid());

-- Sem policy de escrita. As unicas portas sao as funcoes abaixo.
revoke all on public.habilidades_escolhidas from anon, authenticated;
grant select on public.habilidades_escolhidas to authenticated;

-- ── 3. OS PONTOS ───────────────────────────────────────────────────────────
-- 1 por patente alcancada. As tabelas de patente vivem no navegador
-- (assets/js/divisa.js, 6 forcas x 14 degraus), mas os LIMIARES sao os mesmos
-- para todas -- entao aqui basta a escada de XP, sem saber a forca.
create or replace function public.pontos_de_habilidade(xp_base integer)
returns integer language sql immutable set search_path = public as $$
  select count(*)::integer
  from unnest(array[500, 1200, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 35000]) as limiar
  where xp_base >= limiar;
$$;

-- ── 4. O BONUS DE UMA SESSAO ───────────────────────────────────────────────
-- Recebe as propriedades ja calculadas da sessao e devolve o multiplicador.
-- Os bonus SOMAM: quem tem Carga Dupla (5%) e Fogo Sustentado (10%) ganha 15%
-- numa sessao de 60 minutos. Multiplicar daria numeros que ninguem consegue
-- prever de cabeca, e previsibilidade importa mais que elegancia aqui.
create or replace function public.bonus_da_sessao(
  p_uid uuid, p_minutos numeric, p_sequencia integer,
  p_horas_no_dia numeric, p_materias_no_dia integer, p_e_mais_fraca boolean
) returns numeric language sql stable set search_path = public as $$
  select coalesce(sum(h.bonus), 0)
  from public.habilidades_escolhidas e
  join public.catalogo_habilidades h on h.id = e.habilidade_id
  where e.usuario_id = p_uid
    and case h.regra
      when 'sequencia'        then p_sequencia      >= h.limiar
      when 'duracao'          then p_minutos        >= h.limiar
      when 'horasNoDia'       then p_horas_no_dia   >= h.limiar
      when 'materiasNoDia'    then p_materias_no_dia >= h.limiar
      when 'materiaMaisFraca' then p_e_mais_fraca
      else false                      -- regra desconhecida NAO da bonus
    end;
$$;

-- ── 5. O XP COM BONUS ──────────────────────────────────────────────────────
-- Percorre as sessoes calculando, para cada uma, as propriedades que as regras
-- olham -- inclusive a SEQUENCIA QUE A PESSOA TINHA NAQUELE DIA, que sai do
-- truque de ilha (data menos posicao e constante dentro de uma corrida).
create or replace function public.xp_com_bonus(p_uid uuid)
returns jsonb language plpgsql stable set search_path = public as $$
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

  with dias as (
    select distinct (criado_em at time zone 'America/Sao_Paulo')::date as d
    from public.sessoes_estudo where usuario_id = p_uid
  ),
  ilhas as (
    select d, d - (row_number() over (order by d))::integer as ilha from dias
  ),
  sequencias as (
    select d, row_number() over (partition by ilha order by d)::integer as seq from ilhas
  ),
  por_dia as (
    select (criado_em at time zone 'America/Sao_Paulo')::date as d,
           sum(segundos) / 3600.0 as horas,
           count(distinct materia) filter (where materia is not null) as materias
    from public.sessoes_estudo where usuario_id = p_uid group by 1
  )
  select coalesce(sum(
    s.xp * (1 + public.bonus_da_sessao(
      p_uid,
      s.segundos / 60.0,
      sq.seq,
      pd.horas,
      pd.materias::integer,
      v_fraca is not null and lower(public.unaccent_simples(coalesce(s.materia, '')))
                            = lower(public.unaccent_simples(v_fraca))
    ))
  ), 0) into v_total
  from public.sessoes_estudo s
  join sequencias sq on sq.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  join por_dia   pd on pd.d = (s.criado_em at time zone 'America/Sao_Paulo')::date
  where s.usuario_id = p_uid;

  return jsonb_build_object(
    'base',     v_base,
    'comBonus', floor(v_total)::integer,
    'pontos',   public.pontos_de_habilidade(v_base),
    'materiaMaisFraca', v_fraca
  );
end;
$$;

-- ── 6. ESCOLHER — a única porta de escrita ─────────────────────────────────
create or replace function public.escolher_habilidade(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_hab record;
  v_gastos integer;
  v_pontos integer;
  v_xp jsonb;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  select * into v_hab from public.catalogo_habilidades where id = p_id;
  if v_hab is null then
    raise exception 'Habilidade desconhecida.' using errcode = '22023';
  end if;

  if exists (select 1 from public.habilidades_escolhidas
             where usuario_id = v_uid and habilidade_id = p_id) then
    raise exception 'Voce ja tem essa habilidade.' using errcode = '23505';
  end if;

  -- 🔴 O PRE-REQUISITO E CONFERIDO AQUI, no servidor. A tela tambem o mostra,
  -- mas tela e conveniencia: quem chamar a funcao direto tem de bater na mesma
  -- trava.
  if v_hab.degrau > 1 and not exists (
    select 1 from public.habilidades_escolhidas e
    join public.catalogo_habilidades h on h.id = e.habilidade_id
    where e.usuario_id = v_uid and h.ramo = v_hab.ramo and h.degrau = v_hab.degrau - 1
  ) then
    raise exception 'Voce precisa do degrau anterior deste ramo primeiro.' using errcode = '22023';
  end if;

  v_xp := public.xp_com_bonus(v_uid);
  v_pontos := (v_xp->>'pontos')::integer;
  select count(*) into v_gastos from public.habilidades_escolhidas where usuario_id = v_uid;

  if v_gastos >= v_pontos then
    raise exception 'Voce nao tem ponto disponivel.' using errcode = '22023';
  end if;

  insert into public.habilidades_escolhidas (usuario_id, habilidade_id)
  values (v_uid, p_id);

  return jsonb_build_object('ok', true, 'id', p_id,
    'pontos', v_pontos, 'gastos', v_gastos + 1);
end;
$$;

-- ── 7. ESQUECER — o recomeço, de graça ─────────────────────────────────────
-- De GRACA de proposito. Numa arvore de RPG comum se cobra para redistribuir,
-- e isso existe para dar peso a escolha. Aqui seria punir quem explorou --
-- num produto de estudo, e o oposto do que se quer. O que da peso e o PONTO
-- ser escasso, nao o arrependimento ser caro.
create or replace function public.esquecer_habilidades()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_n integer;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;
  delete from public.habilidades_escolhidas where usuario_id = v_uid;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'esquecidas', v_n);
end;
$$;

revoke all on function public.escolher_habilidade(text)   from public, anon;
revoke all on function public.esquecer_habilidades()      from public, anon;
revoke all on function public.xp_com_bonus(uuid)          from public, anon;
revoke all on function public.bonus_da_sessao(uuid, numeric, integer, numeric, integer, boolean) from public, anon;
revoke all on function public.pontos_de_habilidade(integer) from public, anon;

grant execute on function public.escolher_habilidade(text)   to authenticated;
grant execute on function public.esquecer_habilidades()      to authenticated;
grant execute on function public.xp_com_bonus(uuid)          to authenticated;
grant execute on function public.pontos_de_habilidade(integer) to authenticated;
grant execute on function public.bonus_da_sessao(uuid, numeric, integer, numeric, integer, boolean) to authenticated;

comment on function public.escolher_habilidade(text) is
  'Unica porta para gastar um ponto. security definer, le o dono de auth.uid(), '
  'confere pre-requisito e ponto disponivel no SERVIDOR. Ver roadmap-rpg.md R2.';
