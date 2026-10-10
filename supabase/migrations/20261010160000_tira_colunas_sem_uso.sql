-- ============================================================================
-- Tira do banco o que ninguem usa (10/10/2026, guardado 1 -- "pode mandar bala", dele)
--
-- progresso.badges e progresso.cronograma_hoje: so o salvar_progresso GRAVAVA; nenhuma tela e nenhuma funcao do
-- servidor LIA (medido em 10/10 em pg_proc: so salvar_progresso cita as duas; nenhuma visao depende). As
-- condecoracoes moram em `conquistas`; o cronograma e montado da rotina (assets/js/cronograma.js).
-- meu_dominio(): ninguem chamava (so um teste, trocado por materias_estudadas no mesmo dia).
--
-- ORDEM (feita): 1) estado.js parou de mandar as duas colunas no insert inicial (commit 2dd8d87, no ar antes
-- desta); 2) esta migration. O salvar_progresso MANTEM a assinatura (p_cronograma_hoje, p_badges) e ignora os
-- dois: pagina antiga aberta no navegador de alguem continua salvando.
-- Backup antes (tools/backup.js). Volta, se precisar: recriar as colunas com default '[]' -- o dado nelas nunca
-- foi lido por nada.
-- ============================================================================

create or replace function public.salvar_progresso(p_xp integer, p_streak integer, p_horas numeric, p_edital jsonb,
  p_materias jsonb, p_cronograma_hoje jsonb, p_badges jsonb, p_tag_escolhida text)
 returns progresso
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_uid   uuid := auth.uid();
  v_saida public.progresso;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login para salvar o progresso.'
      using errcode = '28000';
  end if;

  -- p_cronograma_hoje e p_badges: aceitos e IGNORADOS desde 10/10/2026 (as colunas sairam). Ficam na assinatura
  -- para pagina antiga, aberta no navegador de alguem, continuar salvando.

  -- Um comando so. `on conflict` resolve a corrida no proprio banco: se duas
  -- gravacoes chegarem no mesmo instante, o Postgres serializa as duas e a
  -- segunda enxerga o resultado da primeira em `progresso.*`.
  insert into public.progresso as p (
    usuario_id, xp, streak, horas, edital, materias, tag_escolhida
  )
  values (
    v_uid,
    greatest(coalesce(p_xp, 0), 0),
    greatest(coalesce(p_streak, 0), 0),
    greatest(coalesce(p_horas, 0), 0),
    p_edital,
    coalesce(p_materias, '[]'::jsonb),
    p_tag_escolhida
  )
  on conflict (usuario_id) do update set
    -- Nao perde o que ja foi conquistado:
    xp     = greatest(p.xp,     coalesce(excluded.xp, 0)),
    streak = greatest(p.streak, coalesce(excluded.streak, 0)),
    horas  = greatest(p.horas,  coalesce(excluded.horas, 0)),

    -- Cada materia fica com o maior progresso ja registrado.
    materias = public.mesclar_materias(p.materias, excluded.materias),

    -- Decisao da pessoa AGORA, entao o que chegou vence. O coalesce evita que uma gravacao parcial apague.
    edital          = coalesce(excluded.edital,          p.edital),
    tag_escolhida   = coalesce(excluded.tag_escolhida,   p.tag_escolhida),

    atualizado_em = now()
  returning * into v_saida;

  return v_saida;
end;
$function$;

alter table public.progresso drop column if exists badges;
alter table public.progresso drop column if exists cronograma_hoje;
drop function if exists public.meu_dominio();
