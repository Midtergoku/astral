-- ============================================================================
-- FILTROS ENCADEADOS -- cada filtro so oferece o que existe com os outros
--
-- Pedido dele em 29/09/2026: "eu escolho a materia de biologia que tem apenas
-- 18 questoes, eu quero que os filtros subsequentes se adequem a ele".
--
-- Ate aqui cada caixa listava o acervo INTEIRO, sem olhar as outras: dava para
-- escolher Biologia + uma banca que nunca teve Biologia, e o resultado era uma
-- rodada vazia. Agora a funcao devolve tambem as COMBINACOES que existem
-- (materia, assunto, banca, prova, ano, quantas) -- 605 para 1.980 questoes,
-- medido -- e a tela cruza as caixas entre si.
--
-- So ACRESCENTA a chave `combinacoes`: tudo o que a funcao ja devolvia fica
-- igual, e quem ainda le as chaves antigas continua funcionando.
-- ============================================================================

create or replace function public.filtros_de_questoes()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from public.questoes where publicada),
    'bancas', coalesce((
      select jsonb_agg(x order by x->>'nome')
      from (select jsonb_build_object('nome', banca, 'quantas', count(*)) as x
            from public.questoes where publicada group by banca) b
    ), '[]'::jsonb),
    'provas', coalesce((
      select jsonb_agg(x order by x->>'banca', x->>'ano' desc, x->>'nome')
      from (select jsonb_build_object(
                     'nome', prova, 'banca', banca, 'ano', ano,
                     'quantas', count(*)) as x
            from public.questoes where publicada group by prova, banca, ano) pr
    ), '[]'::jsonb),
    'anos', coalesce((
      select jsonb_agg(distinct ano order by ano desc)
      from public.questoes where publicada
    ), '[]'::jsonb),
    'materias', coalesce((
      select jsonb_agg(m order by m->>'nome')
      from (
        select jsonb_build_object(
          'nome', materia,
          'quantas', count(*),
          'assuntos', coalesce((
            select jsonb_agg(a order by a->>'nome')
            from (select jsonb_build_object('nome', assunto, 'quantas', count(*)) as a
                  from public.questoes q2
                  where q2.publicada and q2.materia = q1.materia and q2.assunto is not null
                  group by assunto) sub
          ), '[]'::jsonb)
        ) as m
        from public.questoes q1 where publicada group by materia
      ) mm
    ), '[]'::jsonb),
    -- Nomes curtos de proposito: sao ~600 linhas, e a chave se repete em cada uma.
    'combinacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'm', materia, 'a', assunto, 'b', banca, 'p', prova, 'y', ano, 'n', n))
      from (select materia, assunto, banca, prova, ano, count(*) as n
              from public.questoes where publicada
             group by materia, assunto, banca, prova, ano) c
    ), '[]'::jsonb)
  );
$$;
