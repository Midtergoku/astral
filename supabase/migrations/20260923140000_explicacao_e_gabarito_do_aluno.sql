-- ============================================================================
-- A EXPLICACAO DO GABARITO, e o gabarito que o aluno traz
--
-- Dois pedidos dele em 23/09/2026:
--
--   1. "seria bom tambem uma explicacao (...) em vez de ficar verde, pode
--       ficar verde tambem mas apareca a explicacao. Uma explicacao bem
--       resumida do porque."
--      E o recorte honesto que ele mesmo deu: "talvez se nao tiver explicacao
--      ok" -- ou seja, nao e para INVENTAR explicacao. Ela entra quando a
--      propria banca publica, e so.
--
--   2. "como voce disse que o gabarito pode faltar, e interessante tambem
--       colocar essa parte de a pessoa trazer o gabarito tambem. Caso ela
--       tenha, ela coloca o gabarito tambem."
--
-- ⚠️ POR QUE `explicacao` E NULA POR PADRAO, e vai continuar nula na maioria:
-- prova de concurso raramente publica comentario. Quem publica e cursinho, e
-- isso tem dono. O campo existe para o dia em que a banca publicar a solucao
-- (a ESA publica, por exemplo) -- nao para eu escrever palpite.
--
-- 🔴 NENHUMA EXPLICACAO GERADA POR IA ENTRA AQUI. Alem do custo, que ele nao
-- tem, uma explicacao errada e PIOR que nenhuma: a pessoa confia, decora o
-- raciocinio torto, e erra a prova por causa do site.
-- ============================================================================

alter table public.questoes
  add column if not exists explicacao text
    check (explicacao is null or length(btrim(explicacao)) between 10 and 4000);

alter table public.questoes_minhas
  add column if not exists explicacao text
    check (explicacao is null or length(btrim(explicacao)) between 10 and 4000);

-- 🔴 A COLUNA NOVA PRECISA DO GRANT, e esta e a licao de 20/09/2026.
-- Naquele dia acrescentei `xp_validado` a uma tabela com grant de TABELA e a
-- coluna nasceu escrivel pelo usuario. Aqui o problema e o oposto: os grants
-- de `questoes_minhas` sao POR COLUNA, entao coluna nova nasce SEM permissao
-- e o aluno nao conseguiria gravar a explicacao dele. Nos dois casos a regra e
-- a mesma: coluna nova em tabela com grant explicito = conferir o grant no
-- MESMO commit.
grant update (explicacao) on public.questoes_minhas to authenticated;

-- `questoes` (o acervo publico) nao ganha grant nenhum: quem escreve la
-- continua sendo so `publicar_questoes()`, que roda como security definer.

comment on column public.questoes.explicacao is
  'Explicacao do gabarito, quando a BANCA publica. Nula na maioria. '
  'Nunca gerada por IA -- explicacao errada e pior que nenhuma.';
comment on column public.questoes_minhas.explicacao is
  'Explicacao que o proprio aluno escreveu ou colou do material dele.';

-- ── A funcao de publicar precisa saber gravar o campo novo ─────────────────
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
      (banca, prova, ano, numero, materia, assunto,
       enunciado, alternativas, gabarito, publicada, revisao, explicacao)
    values (
      btrim(v_item->>'banca'),
      btrim(v_item->>'prova'),
      (v_item->>'ano')::smallint,
      (v_item->>'numero')::smallint,
      btrim(v_item->>'materia'),
      nullif(btrim(coalesce(v_item->>'assunto','')), ''),
      btrim(v_item->>'enunciado'),
      v_item->'alternativas',
      lower(btrim(v_item->>'gabarito')),
      coalesce((v_item->>'publicada')::boolean, false),
      nullif(btrim(coalesce(v_item->>'revisao','')), ''),
      nullif(btrim(coalesce(v_item->>'explicacao','')), '')
    )
    on conflict (banca, ano, prova, numero) do update set
      materia      = excluded.materia,
      assunto      = excluded.assunto,
      enunciado    = excluded.enunciado,
      alternativas = excluded.alternativas,
      gabarito     = excluded.gabarito,
      publicada    = excluded.publicada,
      revisao      = excluded.revisao,
      -- Nao apaga explicacao que ja existe so porque o lote novo veio sem.
      explicacao   = coalesce(excluded.explicacao, public.questoes.explicacao);
    v_gravadas := v_gravadas + 1;
  end loop;

  return jsonb_build_object(
    'gravadas', v_gravadas,
    'total',    (select count(*) from public.questoes),
    'no_ar',    (select count(*) from public.questoes where publicada));
end;
$$;

-- ── E a que serve a questao precisa devolver o campo novo ──────────────────
create or replace function public.sortear_questoes(
  p_materia text     default null,
  p_assunto text     default null,
  p_banca   text     default null,
  p_ano     int      default null,
  p_limite  int      default 10
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_plano     text;
  v_free      boolean;
  v_ano_teto  int;
  v_hoje      int;
  v_restam    int;
  v_pedir     int;
  v_ids       bigint[];
  v_saida     jsonb;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;

  select coalesce(tipo_plano, 'free') into v_plano from public.perfis where id = v_uid;
  v_free := coalesce(v_plano, 'free') = 'free';
  v_pedir := least(greatest(coalesce(p_limite, 10), 1), 50);

  if v_free then
    v_ano_teto := extract(year from (now() at time zone 'America/Sao_Paulo'))::int - 4;
    select count(*) into v_hoje
    from public.questoes_servidas
    where usuario_id = v_uid
      and (criado_em at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date;
    v_restam := greatest(10 - v_hoje, 0);
    if v_restam = 0 then
      return jsonb_build_object(
        'questoes', '[]'::jsonb, 'plano', v_plano, 'acabou', true,
        'vistas_hoje', v_hoje, 'limite_do_dia', 10,
        'motivo', 'A amostra de hoje acabou. No Pro as questoes sao liberadas por inteiro.');
    end if;
    v_pedir := least(v_pedir, v_restam);
  end if;

  select coalesce(jsonb_agg(q order by q->>'numero'), '[]'::jsonb),
         coalesce(array_agg((q->>'id')::bigint), '{}')
    into v_saida, v_ids
  from (
    select jsonb_build_object(
             'id', id, 'banca', banca, 'prova', prova, 'ano', ano,
             'numero', numero, 'materia', materia, 'assunto', assunto,
             'enunciado', enunciado, 'alternativas', alternativas,
             'gabarito', gabarito, 'explicacao', explicacao) as q
    from public.questoes
    where publicada
      and (p_materia is null or materia = p_materia)
      and (p_assunto is null or assunto = p_assunto)
      and (p_banca   is null or banca   = p_banca)
      and (p_ano     is null or ano     = p_ano)
      and (not v_free or ano <= v_ano_teto)
    order by random()
    limit v_pedir
  ) escolhidas;

  if array_length(v_ids, 1) > 0 then
    insert into public.questoes_servidas (usuario_id, questao_id)
    select v_uid, unnest(v_ids)
    on conflict (usuario_id, questao_id) do nothing;
  end if;

  return jsonb_build_object(
    'questoes', v_saida,
    'plano', v_plano,
    'acabou', false,
    'vistas_hoje', case when v_free then v_hoje + coalesce(array_length(v_ids,1),0) else null end,
    'limite_do_dia', case when v_free then 10 else null end,
    'fora_da_amostra', case when v_free then (
      select count(*) from public.questoes
      where publicada and ano > v_ano_teto
        and (p_materia is null or materia = p_materia)
        and (p_assunto is null or assunto = p_assunto)
        and (p_banca   is null or banca   = p_banca)) else 0 end);
end;
$$;

-- ── O CATALOGO DO FILTRO: tudo o que existe, com quantas de cada ───────────
-- Pedido dele: "la no filtro ja e bom colocar (...) de todas as provas de
-- todos os concursos que tem. Bombeiro, CFO, policial, PRF."
-- A funcao ja devolvia bancas e materias; passa a devolver tambem as PROVAS,
-- para a pessoa escolher o concurso pelo nome e nao so pela sigla da banca.
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
    ), '[]'::jsonb)
  );
$$;
