-- ============================================================================
-- Depoimentos de quem passou, na pagina inicial (10/10/2026, guardado 2 -- "pode mandar bala", dele)
--
-- depoimentos_publicos(): o que a PESSOA AUTORIZOU, e so isso. A caixa do "Passei!" (3.22) diz: "Autorizo o Astral a
-- mostrar este depoimento, com o meu primeiro nome". Entao sai o TEXTO e o PRIMEIRO NOME -- nem o concurso, nem o
-- e-mail, nem o sobrenome.
--   - so com 3 ou mais autorizados (recomendacao gravada: um depoimento sozinho parece inventado). Antes: lista vazia
--     e a secao da pagina nem aparece.
--   - contas de teste (@astral-teste.local) ficam fora; depoimento com menos de 10 letras fica fora.
--   - os 6 mais recentes, ate 400 caracteres cada.
-- Publica (anon) de proposito: e a vitrine. Security definer porque aprovacoes e fechada (RLS so do dono).
-- ============================================================================

create or replace function public.depoimentos_publicos()
returns jsonb language sql stable security definer set search_path = public as $$
  with ok as (
    select btrim(a.depoimento) as depoimento, a.criado_em,
           split_part(btrim(coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), p.nome, '')), ' ', 1) as nome
      from public.aprovacoes a
      join auth.users u on u.id = a.usuario_id
      left join public.perfis p on p.id = a.usuario_id
     where a.pode_publicar
       and char_length(btrim(coalesce(a.depoimento, ''))) >= 10
       and coalesce(u.email, '') not ilike '%@astral-teste.local'
  )
  select case when (select count(*) from ok) >= 3 then
    (select coalesce(jsonb_agg(jsonb_build_object(
              'nome', coalesce(nullif(left(x.nome, 40), ''), 'Aluno'),
              'depoimento', left(x.depoimento, 400)) order by x.criado_em desc), '[]'::jsonb)
       from (select * from ok order by criado_em desc limit 6) x)
  else '[]'::jsonb end;
$$;
revoke all on function public.depoimentos_publicos() from public;
grant execute on function public.depoimentos_publicos() to anon, authenticated;
