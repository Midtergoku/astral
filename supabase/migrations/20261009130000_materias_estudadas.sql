-- ============================================================================
-- As materias do edital: estudada ou nao, com as submaterias (09/10/2026) -- roadmap 3.27
-- Pedido dele: "uma lista das materias para sinalizar se ja foram estudadas ou nao, talvez
-- no dashboard, para indicar o progresso no edital, com as materias e as submaterias dela."
--
-- materias_estudadas(): para cada materia do edital da pessoa (a lista dela, a do cronograma):
--   dominio, minutos estudados, questoes respondidas, e os ASSUNTOS (submaterias) que o Banco
--   tem para ela -- quantas questoes ha no acervo e quantas a pessoa ja respondeu em cada um.
-- Devolve so CONTAGENS: nenhuma questao, nenhum gabarito (3.12). Security definer porque a
-- tabela questoes e fechada ao aluno; le auth.uid(), nunca parametro.
-- ============================================================================

create or replace function public.materias_estudadas()
returns jsonb language sql stable security definer set search_path = public as $$
  with p as (
    select coalesce(materias, '[]'::jsonb) as materias from public.progresso where usuario_id = auth.uid()
  ),
  lista as (
    select t.m, t.ord, coalesce(t.m -> 'medida' ->> 'banco', public.materia_do_banco(t.m ->> 'nome')) as banco
      from p, jsonb_array_elements(p.materias) with ordinality as t(m, ord)
     where coalesce(t.m ->> 'nome', '') <> ''
  ),
  est as (
    select materia, sum(segundos) / 60.0 as minutos
      from public.sessoes_estudo where usuario_id = auth.uid() group by materia
  ),
  ass as (
    select q.materia, q.assunto, count(*)::integer as acervo
      from public.questoes q
     where q.publicada and coalesce(q.assunto, '') <> ''
     group by 1, 2
  ),
  resp as (
    select q.materia, q.assunto, count(*)::integer as respondidas,
           count(*) filter (where r.vezes_errou = 0)::integer as de_primeira
      from public.respostas r
      join public.questoes q on q.id = r.questao_id
     where r.usuario_id = auth.uid() and coalesce(q.assunto, '') <> ''
     group by 1, 2
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'nome',        l.m ->> 'nome',
           'dominio',     coalesce((l.m ->> 'progresso')::numeric, 0),
           'minutos',     round(coalesce(e.minutos, 0))::integer,
           'respondidas', coalesce((l.m -> 'medida' ->> 'respondidas')::integer, 0),
           'banco',       l.banco,
           'assuntos',    coalesce((
               select jsonb_agg(jsonb_build_object(
                        'nome', a.assunto, 'acervo', a.acervo,
                        'respondidas', coalesce(r.respondidas, 0), 'de_primeira', coalesce(r.de_primeira, 0))
                        order by a.assunto)
                 from ass a
                 left join resp r on r.materia = a.materia and r.assunto = a.assunto
                where a.materia = l.banco), '[]'::jsonb)
         ) order by l.ord), '[]'::jsonb)
    from lista l
    left join est e on e.materia = l.m ->> 'nome';
$$;
revoke all on function public.materias_estudadas() from public, anon;
grant execute on function public.materias_estudadas() to authenticated;
