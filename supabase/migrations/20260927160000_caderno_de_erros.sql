-- ============================================================================
-- O CADERNO DE ERROS
--
-- Pedido dele em 27/09/2026: "uma parte de caderno de erros. A pessoa errou de
-- matematica, ela vai poder escolher as opcoes de matematica que sao os erros
-- dela (...) muitas pessoas utilizam so o caderno de erros para estudar."
--
-- A regra do caderno e a classica: O QUE VOCE ERROU VOLTA ATE VOCE ACERTAR.
-- Acertou na revisao, a questao sai. Errou de novo, ela fica -- e sobe na
-- fila, porque "vezes_errou" aumenta.
--
-- ── TRES DECISOES, e o porque de cada uma ──────────────────────────────────
--
-- 1. QUEM DECIDE SE ERROU E O SERVIDOR. A tela manda a LETRA escolhida; o
--    banco compara com o gabarito. Se a tela mandasse "errei/acertei", bastaria
--    o console para fabricar um caderno -- ou esvazia-lo.
--
-- 2. SO ENTRA QUESTAO QUE A PESSOA JA RECEBEU (`questoes_servidas`). Sem esta
--    trava o caderno seria uma porta dos fundos: responder o id de uma questao
--    de prova recente e depois pedir o caderno entregaria o que o plano gratis
--    nao alcanca. Com ela, o caderno so re-mostra o que ja foi mostrado.
--
-- 3. GUARDA-SE SO A ULTIMA RESPOSTA de cada questao, com contadores -- nao o
--    historico de cada clique. O plano do Supabase e o FREE, 500 MB. Log de
--    toda resposta seria ~3,6 MB por pessoa por ano; uma linha por questao e
--    no maximo ~4.000 linhas por pessoa (acervo + as dela), ~400 KB.
--
-- REVISAR NAO GASTA A COTA: o caderno re-mostra o que ja foi servido, entao
-- nao passa pelo contador de 10 por dia do plano gratis.
-- ============================================================================

create table if not exists public.respostas (
  id            bigint generated always as identity primary key,
  usuario_id    uuid    not null references auth.users(id) on delete cascade,
  -- Uma das duas, nunca as duas: questao do acervo publico OU das minhas.
  questao_id    bigint  references public.questoes(id)        on delete cascade,
  minha_id      bigint  references public.questoes_minhas(id) on delete cascade,
  letra         text    not null check (letra in ('a','b','c','d','e')),
  acertou       boolean not null,
  vezes_errou   int     not null default 0,
  vezes_acertou int     not null default 0,
  atualizado_em timestamptz not null default now(),
  check (num_nonnulls(questao_id, minha_id) = 1)
);

create unique index if not exists respostas_uma_por_questao
  on public.respostas (usuario_id, questao_id) where questao_id is not null;
create unique index if not exists respostas_uma_por_minha
  on public.respostas (usuario_id, minha_id) where minha_id is not null;
create index if not exists respostas_caderno
  on public.respostas (usuario_id, acertou) where acertou = false;

-- Fechada como o acervo: RLS ligada, grant nenhum. So as funcoes abaixo.
alter table public.respostas enable row level security;
revoke all on public.respostas from anon, authenticated;

-- ── Registrar uma resposta ─────────────────────────────────────────────────
-- p_origem: 'acervo' (questao publica) ou 'minha' (questao que ela subiu).
create or replace function public.registrar_resposta(
  p_origem text, p_id bigint, p_letra text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_letra   text := lower(btrim(coalesce(p_letra, '')));
  v_gab     text;
  v_acertou boolean;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;
  if v_letra not in ('a','b','c','d','e') then
    raise exception 'letra invalida' using errcode = '22023';
  end if;

  if p_origem = 'acervo' then
    -- 🔴 A trava 2: so questao que ela JA RECEBEU.
    if not exists (select 1 from public.questoes_servidas
                   where usuario_id = v_uid and questao_id = p_id) then
      raise exception 'questao nao foi servida a voce' using errcode = '42501';
    end if;
    select gabarito into v_gab from public.questoes where id = p_id and publicada;
    if v_gab is null then
      raise exception 'questao indisponivel' using errcode = '22023';
    end if;
    v_acertou := (v_letra = v_gab);
    insert into public.respostas (usuario_id, questao_id, letra, acertou, vezes_errou, vezes_acertou)
    values (v_uid, p_id, v_letra, v_acertou,
            case when v_acertou then 0 else 1 end, case when v_acertou then 1 else 0 end)
    on conflict (usuario_id, questao_id) where questao_id is not null do update set
      letra = excluded.letra, acertou = excluded.acertou, atualizado_em = now(),
      vezes_errou   = public.respostas.vezes_errou   + excluded.vezes_errou,
      vezes_acertou = public.respostas.vezes_acertou + excluded.vezes_acertou;

  elsif p_origem = 'minha' then
    -- A questao tem de ser DELA. Le auth.uid(), nunca parametro.
    select gabarito into v_gab from public.questoes_minhas
    where id = p_id and usuario_id = v_uid;
    if not found then
      raise exception 'questao nao encontrada' using errcode = '42501';
    end if;
    -- Sem gabarito nao ha como errar nem acertar: nada a registrar.
    if v_gab is null then
      return jsonb_build_object('registrado', false, 'motivo', 'sem gabarito');
    end if;
    v_acertou := (v_letra = v_gab);
    insert into public.respostas (usuario_id, minha_id, letra, acertou, vezes_errou, vezes_acertou)
    values (v_uid, p_id, v_letra, v_acertou,
            case when v_acertou then 0 else 1 end, case when v_acertou then 1 else 0 end)
    on conflict (usuario_id, minha_id) where minha_id is not null do update set
      letra = excluded.letra, acertou = excluded.acertou, atualizado_em = now(),
      vezes_errou   = public.respostas.vezes_errou   + excluded.vezes_errou,
      vezes_acertou = public.respostas.vezes_acertou + excluded.vezes_acertou;
  else
    raise exception 'origem invalida' using errcode = '22023';
  end if;

  return jsonb_build_object('registrado', true, 'acertou', v_acertou);
end;
$$;

-- ── O caderno ──────────────────────────────────────────────────────────────
-- Devolve as questoes cuja ULTIMA resposta foi errada, as que mais se erra
-- primeiro. E a contagem por materia, para o filtro do proprio caderno.
create or replace function public.caderno_de_erros(
  p_materia text default null, p_limite int default 10
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_lim   int  := least(greatest(coalesce(p_limite, 10), 1), 50);
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'questoes', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id', q.id, 'origem', 'acervo', 'banca', q.banca, 'prova', q.prova,
          'ano', q.ano, 'numero', q.numero, 'materia', q.materia, 'assunto', q.assunto,
          'enunciado', q.enunciado, 'alternativas', q.alternativas, 'gabarito', q.gabarito,
          'explicacao', q.explicacao, 'tipo', q.tipo, 'texto_apoio', q.texto_apoio,
          'vezes_errou', r.vezes_errou, 'letra_anterior', r.letra) as x,
          r.vezes_errou as ordem, r.atualizado_em as quando
        from public.respostas r
        join public.questoes q on q.id = r.questao_id and q.publicada
        where r.usuario_id = v_uid and not r.acertou
          and (p_materia is null or q.materia = p_materia)
        union all
        select jsonb_build_object(
          'id', m.id, 'origem', 'minha', 'banca', m.origem, 'prova', m.origem,
          'ano', null, 'numero', null, 'materia', coalesce(m.materia, 'sua questão'),
          'assunto', m.assunto, 'enunciado', m.enunciado, 'alternativas', m.alternativas,
          'gabarito', m.gabarito, 'explicacao', m.explicacao, 'tipo', m.tipo,
          'texto_apoio', m.texto_apoio,
          'vezes_errou', r.vezes_errou, 'letra_anterior', r.letra),
          r.vezes_errou, r.atualizado_em
        from public.respostas r
        join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
        where r.usuario_id = v_uid and not r.acertou
          and (p_materia is null or coalesce(m.materia, 'sua questão') = p_materia)
        order by 2 desc, 3 desc
        limit v_lim
      ) t
    ), '[]'::jsonb),
    'por_materia', coalesce((
      select jsonb_agg(jsonb_build_object('nome', materia, 'quantas', n) order by n desc)
      from (
        select coalesce(q.materia, m.materia, 'sua questão') as materia, count(*) as n
        from public.respostas r
        left join public.questoes q on q.id = r.questao_id and q.publicada
        left join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
        where r.usuario_id = v_uid and not r.acertou
          and (q.id is not null or m.id is not null)
        group by 1
      ) pm
    ), '[]'::jsonb),
    'total', (select count(*) from public.respostas r
              left join public.questoes q on q.id = r.questao_id and q.publicada
              left join public.questoes_minhas m on m.id = r.minha_id and m.usuario_id = v_uid
              where r.usuario_id = v_uid and not r.acertou
                and (q.id is not null or m.id is not null))
  );
end;
$$;

revoke all on function public.registrar_resposta(text, bigint, text) from public, anon;
revoke all on function public.caderno_de_erros(text, int) from public, anon;
grant execute on function public.registrar_resposta(text, bigint, text) to authenticated;
grant execute on function public.caderno_de_erros(text, int) to authenticated;

comment on table public.respostas is
  'A ULTIMA resposta de cada pessoa a cada questao, com contadores. Base do '
  'caderno de erros. Fechada: so registrar_resposta() escreve, e quem decide '
  'se errou e o servidor, comparando com o gabarito.';
