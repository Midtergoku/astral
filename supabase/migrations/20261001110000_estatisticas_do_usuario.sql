-- ============================================================================
-- A FONTE UNICA DE ESTATISTICAS -- `estatisticas_do_usuario()`
--
-- A recomendacao estrutural da auditoria de 30/09 (o `user_stats`), autorizada
-- por ele em 01/10/2026: "faco quando voce mandar -- entao pode fazer agora".
--
-- ── O QUE HAVIA ─────────────────────────────────────────────────────────────
-- Cada tela lia o seu pedaco e calculava o "dia" do seu jeito:
--   - painel e cronometro: sessoes de hoje pelo RELOGIO DO APARELHO;
--   - grafico da semana e "Horas por semana": idem;
--   - diario e revisao: o horario de Sao Paulo, por conta propria (-3 h);
--   - ficha, condecoracoes, missoes: o servidor (fatos_do_usuario, fatos_de_hoje).
-- Os numeros batiam para quem esta em Brasilia, mas nao vinham de um lugar so
-- -- e para um aluno no Acre o cronometro dizia "0 min hoje" enquanto a missao
-- dizia "estudou 50 min hoje" (auditoria, NUM-05).
--
-- ── O QUE PASSA A HAVER ─────────────────────────────────────────────────────
-- UMA chamada devolve tudo o que as telas mostram sobre o estudo:
--   fatos   -- fatos_do_usuario() (ficha, dominio, sequencia, contadores)
--   hoje    -- fatos_de_hoje() + o dia de hoje em Sao Paulo
--   sessoes -- as sessoes dos ultimos 400 dias, cada uma COM O DIA JA
--              CALCULADO aqui, no fuso de Sao Paulo. O navegador nao calcula
--              mais dia nenhum: le `dia`.
--   plano   -- meu_plano() (as regras do plano, migration 20261001100000)
--
-- ⚠️ NENHUMA REGRA DE CALCULO MUDOU. Sequencia, XP, dominio e condecoracoes
-- continuam nas mesmas funcoes; o dia de uma sessao continua sendo o dia em que
-- ela TERMINOU (`criado_em`) -- mudar isso e o achado NUM-06 do roadmap, nao
-- este passo. O que muda e so DE ONDE as telas leem.
--
-- security invoker: le pelas mesmas policies de cada tabela -- ninguem ve a
-- estatistica de outro.
-- ============================================================================

create or replace function public.estatisticas_do_usuario()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'fatos', public.fatos_do_usuario(),
    'hoje',  public.fatos_de_hoje() || jsonb_build_object('dia', v_hoje),
    'plano', public.meu_plano(),
    'sessoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'materia', s.materia,
               'segundos', s.segundos,
               'xp', s.xp,
               'modo', s.modo,
               'criado_em', s.criado_em,
               'dia', (s.criado_em at time zone 'America/Sao_Paulo')::date)
             order by s.criado_em)
      from public.sessoes_estudo s
      where s.usuario_id = v_uid
        and s.criado_em >= (v_hoje - 400)::timestamp at time zone 'America/Sao_Paulo'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.estatisticas_do_usuario() from public, anon;
grant execute on function public.estatisticas_do_usuario() to authenticated;

comment on function public.estatisticas_do_usuario() is
  'Fonte unica do que as telas mostram sobre o estudo (01/10/2026): fatos, hoje, '
  'plano e as sessoes dos ultimos 400 dias com o dia ja calculado no fuso de Sao Paulo.';
