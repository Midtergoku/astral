-- ============================================================================
-- O DOMINIO DE CADA MATERIA PASSA A SER MEDIDO PELO SERVIDOR
--
-- Pedido dele em 30/09/2026: "como e medido o dominio? Toda a economia do app
-- depende disso. Deveria depender cada vez mais das questoes do banco". E, na
-- resposta: "pode sim mexer na parte da economia inteira, do dominio e
-- rebalanceamento".
--
-- ── O QUE ESTAVA ERRADO (medido em 30/09) ────────────────────────────────────
-- `progresso.materias[].progresso` NUNCA era calculado por ninguem. Nascia 0
-- quando o edital era lido e so era LIDO depois. Para um aluno de verdade:
-- tag (>= 70%) inalcancavel, Doutrina 0, condecoracoes de dominio mortas, o
-- aviso de rebalancear nunca disparava e o cronograma nao se adaptava. E o
-- navegador podia gravar qualquer valor (`mesclar_materias` guarda o maior).
--
-- ── A REGRA ──────────────────────────────────────────────────────────────────
--   Q (questoes) = acertos de primeira / respondidas  x  confianca
--       confianca = respondidas / alvo, ate 1;  alvo = 30 (ou o acervo
--       inteiro da materia, se ele tiver menos de 30)
--   S (estudo)   = minutos estudados na materia / 600, ate 1   (10 h)
--
--   materia com Banco (>= 10 questoes publicadas):  100 x (0,6 Q + 0,4 S)
--   materia sem Banco:                              100 x minutos / 900, ate 1
--     ✏️ mudou no mesmo dia para 70 x minutos / 900 (teto 70): ver a
--     migration 20260930130000, que explica o porque.
--
-- Por que assim:
--   - So estudar leva ate 40. A tag (70) exige ACERTAR questao: o dominio
--     "depende cada vez mais do banco", como ele pediu.
--   - "De primeira", como a Precisao: repetir no caderno de erros a questao
--     que ja sabe nao infla nada (ver a migration 20260928100000).
--   - A confianca impede que 3 acertos em 3 virem 100%: sao sorte, nao dominio.
--   - Materia que o Banco nao tem (ex.: "Conhecimentos especificos") nao fica
--     presa em 40 para sempre: mede-se pelo estudo, 15 h para o maximo -- e a
--     tela diz que ali a medida e so o estudo.
--   - So o ACERVO conta. Nas questoes que a pessoa sobe, o gabarito e dela.
--
-- O NOME: a materia do edital vem da IA ("Lingua Portuguesa", "Nocoes de
-- Informatica"); a do Banco e o nome canonico ("Portugues"). Quem casa os dois
-- e a MESMA lista que da nome as materias do Banco -- `MATERIAS_CONHECIDAS`,
-- em assets/js/prova.js --, espelhada na tabela `materias_conhecidas` por
-- `tools/sincroniza-materias.js`. Uma lista, nao duas.
--
-- ── QUANDO RECALCULA ─────────────────────────────────────────────────────────
-- Pelo gatilho `progresso_do_servidor`, que ja recalculava XP/horas/sequencia:
-- toda gravacao do site no progresso. E, novo, depois de cada sessao de estudo
-- e de cada resposta do Banco -- senao o dominio so mudaria quando a pessoa
-- abrisse o painel.
--
-- 🔑 A chave de servico continua de fora (`gravacao_pelo_site`), como no XP:
-- e com ela que os testes semeiam e que a simulacao do dono e montada.
-- ============================================================================

-- ── 1. A lista de materias, espelho de prova.js ──────────────────────────────
create table if not exists public.materias_conhecidas (
  ordem  integer primary key,
  padrao text    not null,   -- expressao regular (POSIX do Postgres; \b do JS virou \y)
  nome   text    not null
);
alter table public.materias_conhecidas enable row level security;
revoke all on public.materias_conhecidas from anon, authenticated;

comment on table public.materias_conhecidas is
  'Espelho de MATERIAS_CONHECIDAS (assets/js/prova.js), escrito por tools/sincroniza-materias.js. '
  'A ORDEM manda: o mais especifico primeiro. Nao editar a mao.';

create or replace function public.materia_do_banco(p_nome text)
returns text language sql stable security definer set search_path = public as $$
  select nome from public.materias_conhecidas
   where coalesce(p_nome, '') ~* padrao
   order by ordem limit 1;
$$;

-- ── 2. O calculo ────────────────────────────────────────────────────────────
-- A regra, num lugar so (o cabecalho explica cada numero).
create or replace function public.dominio_formula(
  p_acervo integer, p_respondidas integer, p_primeira integer, p_minutos numeric)
returns integer language sql immutable as $$
  select case
    when coalesce(p_acervo, 0) >= 10 then round(100 * (
           0.6 * case when coalesce(p_respondidas, 0) > 0
                      then (p_primeira::numeric / p_respondidas)
                           * least(1.0, p_respondidas::numeric / least(30, greatest(p_acervo, 1)))
                      else 0 end
         + 0.4 * least(1.0, coalesce(p_minutos, 0) / 600.0)))::integer
    else round(100 * least(1.0, coalesce(p_minutos, 0) / 900.0))::integer
  end;
$$;

-- Recebe a lista de materias e devolve A MESMA lista, com `progresso` medido e
-- `medida` explicando de onde veio (a tela mostra isso).
--
-- `medida.semana` e o dominio no INICIO DA SEMANA (segunda, 0h de Sao Paulo).
-- E por ele que o cronograma distribui as sessoes (plano.js, necessidadeDe):
-- o dominio ao vivo muda a cada questao, e o plano de hoje nao pode trocar de
-- materia no meio do dia. Assim a semana fica parada e se rebalanceia toda
-- segunda, pelo desempenho. (Aproximacao conhecida: `respostas` guarda so a
-- ULTIMA resposta de cada questao; uma questao refeita nesta semana sai da
-- conta da semana. Erra para baixo, nunca inventa dominio.)
create or replace function public.dominio_calculado(p_uid uuid, p_materias jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  with corte as (
    select (date_trunc('week', now() at time zone 'America/Sao_Paulo')
            at time zone 'America/Sao_Paulo') as t
  ),
  ed as (
    select t.m, t.ord, public.materia_do_banco(t.m ->> 'nome') as banco
      from jsonb_array_elements(
             case when jsonb_typeof(p_materias) = 'array' then p_materias else '[]'::jsonb end
           ) with ordinality as t(m, ord)
     where jsonb_typeof(t.m) = 'object'
  ),
  acervo as (
    select materia, count(*) as n from public.questoes where publicada group by materia
  ),
  resp as (
    select q.materia,
           count(*) as n,
           count(*) filter (where r.vezes_errou = 0) as primeira,
           count(*) filter (where r.atualizado_em < (select t from corte)) as n_sem,
           count(*) filter (where r.vezes_errou = 0 and r.atualizado_em < (select t from corte)) as primeira_sem
      from public.respostas r
      join public.questoes q on q.id = r.questao_id
     where r.usuario_id = p_uid and r.questao_id is not null
     group by q.materia
  ),
  est as (
    select materia,
           sum(segundos) / 60.0 as minutos,
           coalesce(sum(segundos) filter (where criado_em < (select t from corte)), 0) / 60.0 as minutos_sem
      from public.sessoes_estudo where usuario_id = p_uid
     group by materia
  ),
  conta as (
    select ed.m, ed.ord, ed.banco,
           coalesce(a.n, 0)::integer            as acervo,
           coalesce(r.n, 0)::integer            as respondidas,
           coalesce(r.primeira, 0)::integer     as primeira,
           coalesce(e.minutos, 0)               as minutos,
           coalesce(r.n_sem, 0)::integer        as respondidas_sem,
           coalesce(r.primeira_sem, 0)::integer as primeira_sem,
           coalesce(e.minutos_sem, 0)           as minutos_sem
      from ed
      left join acervo a on a.materia = ed.banco
      left join resp   r on r.materia = ed.banco
      left join est    e on e.materia = ed.m ->> 'nome'
  )
  select coalesce(jsonb_agg(
           c.m || jsonb_build_object(
             'progresso', public.dominio_formula(c.acervo, c.respondidas, c.primeira, c.minutos),
             'medida', jsonb_build_object(
               'fonte',       case when c.acervo >= 10 then 'banco' else 'estudo' end,
               'banco',       c.banco,
               'respondidas', c.respondidas,
               'de_primeira', c.primeira,
               'alvo',        case when c.acervo >= 10 then least(30, c.acervo) else null end,
               'minutos',     round(c.minutos)::integer,
               'semana',      public.dominio_formula(c.acervo, c.respondidas_sem, c.primeira_sem, c.minutos_sem)))
           order by c.ord), '[]'::jsonb)
    from conta c;
$$;

-- ── 3. O gatilho do progresso passa a medir o dominio tambem ────────────────
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
  -- 30/09/2026: o dominio que o navegador mandou deixa de valer.
  new.materias := public.dominio_calculado(new.usuario_id, new.materias);
  return new;
end;
$$;

-- ── 4. Estudou ou respondeu: o dominio anda na hora ─────────────────────────
-- Um UPDATE que nao muda nada visivel: quem faz a conta e o gatilho acima.
-- security definer porque `progresso` tem grant coluna a coluna (ver a
-- migration 20260920201000 -- ja derrubou o salvamento uma vez).
create or replace function public.dominio_depois_de_estudar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.progresso set materias = materias where usuario_id = new.usuario_id;
  return null;
end;
$$;

drop trigger if exists dominio_apos_sessao on public.sessoes_estudo;
create trigger dominio_apos_sessao
  after insert on public.sessoes_estudo
  for each row execute function public.dominio_depois_de_estudar();

drop trigger if exists dominio_apos_resposta on public.respostas;
create trigger dominio_apos_resposta
  after insert or update on public.respostas
  for each row execute function public.dominio_depois_de_estudar();

-- ── 5. O que a tela le: o dominio de cada materia, com o porque ─────────────
create or replace function public.meu_dominio()
returns jsonb language sql stable security definer set search_path = public as $$
  select public.dominio_calculado(auth.uid(),
           (select materias from public.progresso where usuario_id = auth.uid()));
$$;

revoke all on function public.dominio_formula(integer, integer, integer, numeric) from public, anon;
grant execute on function public.dominio_formula(integer, integer, integer, numeric) to authenticated, service_role;
revoke all on function public.materia_do_banco(text) from public, anon;
revoke all on function public.dominio_calculado(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.dominio_depois_de_estudar() from public, anon, authenticated;
revoke all on function public.meu_dominio() from public, anon;
grant execute on function public.materia_do_banco(text) to authenticated, service_role;
grant execute on function public.meu_dominio() to authenticated;
-- A chave de servico: a simulacao do dono e os testes recalculam por aqui.
grant execute on function public.dominio_calculado(uuid, jsonb) to service_role;
