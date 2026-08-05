-- ═══════════════════════════════════════════════════════════════════════════
-- CONTROLE DE CONCORRENCIA — o "ultimo salva por cima" acaba aqui.
--
-- O PROBLEMA (levantado em 05/08/2026)
-- Ate agora o app gravava o progresso com um upsert que SUBSTITUIA a linha
-- inteira. Duas telas abertas -- celular e computador -- e a ultima a salvar
-- apagava o que a outra tinha feito. Como duas pessoas editando a mesma
-- planilha: quem salva por ultimo apaga o trabalho do outro.
--
-- Com 8 usuarios isso era teorico. Vira real no dia em que alguem estudar no
-- onibus pelo celular e continuar em casa no computador -- que e exatamente o
-- uso que o produto promete.
--
-- A ESCOLHA: MESCLAR, nao travar.
-- A alternativa classica seria versionar a linha e recusar a gravacao antiga
-- ("optimistic locking"). Recusar significa devolver erro para alguem que
-- acabou de estudar -- e ai a tela teria de recarregar, refazer a conta e
-- tentar de novo, com chance de piscar na cara da pessoa.
--
-- Aqui os dados tem uma propriedade que permite algo melhor: eles quase so
-- CRESCEM. XP nao diminui. Hora estudada nao diminui. Conquista nao se perde.
-- Entao a fusao e obvia e nao precisa de arbitro:
--
--   xp, streak, horas ..... fica o MAIOR    (ninguem perde o que fez)
--   badges ................ UNIAO           (conquista nao se desconquista)
--   materias .............. maior progresso de cada uma
--   cronograma_hoje ....... vence o que chegou (e o plano de hoje)
--   edital, tag_escolhida . vence o que chegou (sao escolhas deliberadas)
--
-- ⚠️ POR QUE `security invoker`: a funcao roda com a identidade de quem
-- chamou, entao as policies de RLS continuam valendo e `auth.uid()` e a pessoa
-- de verdade. Com `security definer` ela rodaria como dona do banco e furaria
-- a propria protecao -- exatamente o tipo de porta que a gente fechou em julho.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Auxiliar: mescla duas listas de materias ────────────────────────────────
-- A lista que CHEGA manda na composicao (ela reflete o edital atual: se a
-- pessoa trocou de edital, as materias antigas tem de sumir mesmo). O que se
-- preserva da lista antiga e so o PROGRESSO, quando ele for maior.
create or replace function public.mesclar_materias(antigas jsonb, novas jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_agg(
      nova || jsonb_build_object(
        'progresso',
        greatest(
          coalesce((nova->>'progresso')::numeric, 0),
          coalesce((
            select (antiga->>'progresso')::numeric
            from jsonb_array_elements(coalesce(antigas, '[]'::jsonb)) antiga
            where antiga->>'nome' = nova->>'nome'
            limit 1
          ), 0)
        )
      )
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(novas, '[]'::jsonb)) with ordinality as t(nova, ord);
$$;

comment on function public.mesclar_materias is
  'Une duas listas de materias mantendo o MAIOR progresso de cada uma. A lista nova define quais materias existem.';

-- ── A funcao que o app passa a chamar ───────────────────────────────────────
create or replace function public.salvar_progresso(
  p_xp              integer,
  p_streak          integer,
  p_horas           numeric,
  p_edital          jsonb,
  p_materias        jsonb,
  p_cronograma_hoje jsonb,
  p_badges          jsonb,
  p_tag_escolhida   text
)
returns public.progresso
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_saida public.progresso;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login para salvar o progresso.'
      using errcode = '28000';
  end if;

  -- Um comando so. `on conflict` resolve a corrida no proprio banco: se duas
  -- gravacoes chegarem no mesmo instante, o Postgres serializa as duas e a
  -- segunda enxerga o resultado da primeira em `progresso.*`. Fazer
  -- "le, decide, grava" em tres passos deixaria uma fresta entre ler e gravar.
  insert into public.progresso as p (
    usuario_id, xp, streak, horas, edital, materias, cronograma_hoje, badges, tag_escolhida
  )
  values (
    v_uid,
    greatest(coalesce(p_xp, 0), 0),
    greatest(coalesce(p_streak, 0), 0),
    greatest(coalesce(p_horas, 0), 0),
    p_edital,
    coalesce(p_materias, '[]'::jsonb),
    coalesce(p_cronograma_hoje, '[]'::jsonb),
    coalesce(p_badges, '[]'::jsonb),
    p_tag_escolhida
  )
  on conflict (usuario_id) do update set
    -- Nao perde o que ja foi conquistado:
    xp     = greatest(p.xp,     coalesce(excluded.xp, 0)),
    streak = greatest(p.streak, coalesce(excluded.streak, 0)),
    horas  = greatest(p.horas,  coalesce(excluded.horas, 0)),

    -- Conquista nao se desconquista. Uniao sem repetir.
    badges = (
      select coalesce(jsonb_agg(distinct b), '[]'::jsonb)
      from jsonb_array_elements(p.badges || excluded.badges) b
    ),

    -- Cada materia fica com o maior progresso ja registrado.
    materias = public.mesclar_materias(p.materias, excluded.materias),

    -- Estes tres sao decisao da pessoa AGORA, entao o que chegou vence.
    -- O coalesce evita que uma gravacao parcial apague o que existia.
    cronograma_hoje = coalesce(excluded.cronograma_hoje, p.cronograma_hoje),
    edital          = coalesce(excluded.edital,          p.edital),
    tag_escolhida   = coalesce(excluded.tag_escolhida,   p.tag_escolhida),

    atualizado_em = now()
  returning * into v_saida;

  return v_saida;
end;
$$;

comment on function public.salvar_progresso is
  'Grava o progresso MESCLANDO com o que ja existe, para duas telas abertas nao apagarem o trabalho uma da outra. Ver o cabecalho da migration 20260805200000.';

-- Quem pode chamar: usuario logado. `anon` fica de fora -- sem sessao nao ha
-- progresso para salvar, e a propria funcao ja recusaria.
revoke all on function public.salvar_progresso(integer, integer, numeric, jsonb, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.salvar_progresso(integer, integer, numeric, jsonb, jsonb, jsonb, jsonb, text) to authenticated;

revoke all on function public.mesclar_materias(jsonb, jsonb) from public, anon;
grant execute on function public.mesclar_materias(jsonb, jsonb) to authenticated;
