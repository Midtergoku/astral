-- ============================================================================
-- CERTO OU ERRADO -- o formato do Cebraspe (PRF, Policia Federal, tribunais)
--
-- Pedido dele em 27/09/2026: "quero que voce adicione o formato de certo e
-- errado porque muitas questoes sao de certo e errado (...) adeque isso".
--
-- Cada item do Cebraspe e UMA AFIRMACAO, sem alternativas: quem estuda julga
-- se ela e Certa ou Errada. Medido na prova real da PRF 2021 (99 itens).
--
-- ── COMO CABE NO QUE JA EXISTE, sem quebrar nada ───────────────────────────
-- Um item certo/errado e guardado com alternativas {"c":"Certo","e":"Errado"}
-- e gabarito "c" ou "e". As duas letras JA estao na lista permitida
-- (a,b,c,d,e), e a trava `alternativas ? gabarito` continua valendo. Nenhuma
-- regra antiga precisou afrouxar. O que muda e so a coluna `tipo`, que diz a
-- tela para desenhar dois botoes em vez de cinco.
--
-- ── O TEXTO DE APOIO, e por que ele nao e opcional ─────────────────────────
-- No Cebraspe um grupo de itens depende de um texto que vem ANTES: "Texto
-- 1A18-I" ou "Considerando essa situacao hipotetica". O item 9 da PRF diz so
-- "A transferencia da policia do sistema de justica para o governo da cidade
-- marca uma mudanca de paradigma" -- impossivel de julgar sem o texto.
-- Guardar o item sem o texto seria publicar questao que nao se responde, que
-- e pior que nao publicar. Por isso `texto_apoio` tem coluna propria.
-- ============================================================================

alter table public.questoes
  add column if not exists tipo text not null default 'multipla'
    check (tipo in ('multipla', 'certo_errado'));
alter table public.questoes
  add column if not exists texto_apoio text
    check (texto_apoio is null or length(texto_apoio) <= 20000);

alter table public.questoes_minhas
  add column if not exists tipo text not null default 'multipla'
    check (tipo in ('multipla', 'certo_errado'));
alter table public.questoes_minhas
  add column if not exists texto_apoio text
    check (texto_apoio is null or length(texto_apoio) <= 20000);

-- 🔴 A LICAO DE 20/09 DE NOVO: `questoes_minhas` tem grant POR COLUNA, entao
-- coluna nova nasce SEM permissao -- o aluno nao conseguiria gravar o tipo do
-- item que ele mesmo subiu. Conferir o grant no MESMO commit que a coluna.
grant update (tipo, texto_apoio) on public.questoes_minhas to authenticated;

-- Certo/errado so pode ter gabarito c ou e -- nunca a, b ou d.
alter table public.questoes drop constraint if exists questoes_certo_errado_coerente;
alter table public.questoes add constraint questoes_certo_errado_coerente
  check (tipo <> 'certo_errado' or gabarito in ('c', 'e'));

-- ── publicar_questoes passa a gravar os campos novos ───────────────────────
create or replace function public.publicar_questoes(p_questoes jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gravadas int := 0;
  v_item     jsonb;
begin
  if not public.sou_administrador() then
    raise exception 'apenas administrador publica questao' using errcode = '42501';
  end if;
  if jsonb_typeof(p_questoes) <> 'array' then
    raise exception 'esperava uma lista de questoes' using errcode = '22023';
  end if;
  if jsonb_array_length(p_questoes) > 500 then
    raise exception 'no maximo 500 questoes por vez' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_questoes) loop
    insert into public.questoes
      (banca, prova, ano, numero, materia, assunto, enunciado, alternativas,
       gabarito, publicada, revisao, explicacao, tipo, texto_apoio)
    values (
      btrim(v_item->>'banca'), btrim(v_item->>'prova'),
      (v_item->>'ano')::smallint, (v_item->>'numero')::smallint,
      btrim(v_item->>'materia'),
      nullif(btrim(coalesce(v_item->>'assunto','')), ''),
      btrim(v_item->>'enunciado'), v_item->'alternativas',
      lower(btrim(v_item->>'gabarito')),
      coalesce((v_item->>'publicada')::boolean, false),
      nullif(btrim(coalesce(v_item->>'revisao','')), ''),
      nullif(btrim(coalesce(v_item->>'explicacao','')), ''),
      coalesce(nullif(btrim(v_item->>'tipo'), ''), 'multipla'),
      nullif(btrim(coalesce(v_item->>'texto_apoio','')), '')
    )
    on conflict (banca, ano, prova, numero) do update set
      materia = excluded.materia, assunto = excluded.assunto,
      enunciado = excluded.enunciado, alternativas = excluded.alternativas,
      gabarito = excluded.gabarito, publicada = excluded.publicada,
      revisao = excluded.revisao,
      explicacao = coalesce(excluded.explicacao, public.questoes.explicacao),
      tipo = excluded.tipo, texto_apoio = excluded.texto_apoio;
    v_gravadas := v_gravadas + 1;
  end loop;

  return jsonb_build_object('gravadas', v_gravadas,
    'total', (select count(*) from public.questoes),
    'no_ar', (select count(*) from public.questoes where publicada));
end;
$$;
