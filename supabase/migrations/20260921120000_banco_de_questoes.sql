-- ============================================================================
-- O BANCO DE QUESTOES -- a tabela, e as travas em volta dela.
--
-- Q2/Q3 do roadmap. Questoes de provas militares antigas, que sao documento
-- publico. Ate hoje existiam as duas ferramentas de extrair e classificar
-- (medidas em 17 e 19/09) e NENHUM lugar para guardar o resultado.
--
-- ── AS TRES DECISOES QUE ESTA MIGRATION TOMA, e o porque de cada uma ────────
--
-- 1. NINGUEM LE A TABELA DIRETO. Nem `anon`, nem `authenticated` recebem
--    select em `questoes`. Quem serve questao e a funcao `sortear_questoes`.
--
--    Parece exagero e nao e: a ordem dele em 18/09 foi "so sera liberado
--    totalmente as questoes para os pros", com amostra gratis para os demais.
--    Se o app lesse a tabela por PostgREST, qualquer pessoa autenticada
--    baixaria o acervo inteiro numa requisicao e o plano Pro perderia o
--    sentido no mesmo dia. O portao TEM de estar do lado de dentro.
--
-- 2. NINGUEM ESCREVE, exceto quem esta em `administradores`. Mesma forma do R0
--    (`sincronizar_conquistas`): zero grant de insert/update/delete, e uma
--    unica porta `security definer` que le o dono de auth.uid(), nunca de
--    parametro.
--
--    🔴 A TABELA `administradores` NASCE VAZIA DE PROPOSITO. A linha do Lucas
--    entra por fora, com service_role. O repositorio e PUBLICO e o id/e-mail
--    dele nao vai para dentro de arquivo versionado.
--
-- 3. QUESTAO NOVA NASCE DESPUBLICADA (`publicada = false`). A extracao acerta
--    81% sozinha -- o resto depende de figura ou vem truncado, e questao
--    truncada e PIOR que questao ausente para quem estuda. Entao publicar e
--    ato deliberado, feito na tela de conferencia, nunca efeito colateral de
--    importar um PDF.
--
-- ⚠️ LICAO DE 20/09 APLICADA AQUI: nenhuma destas tabelas recebe grant amplo.
-- Naquele dia acrescentei uma coluna a uma tabela com `grant ... on table` e
-- ela nasceu escrivel pelo usuario em silencio. Coluna nova herda a permissao
-- do grant mais permissivo que ja estava la. Aqui o padrao e o contrario:
-- revoke primeiro, e so funcao entra.
-- ============================================================================

-- ── 1. O ACERVO ─────────────────────────────────────────────────────────────
create table if not exists public.questoes (
  id            bigint generated always as identity primary key,

  -- De onde a questao veio. Os tres juntos sao o filtro que ele pediu em 18/09.
  banca         text     not null check (length(btrim(banca)) between 2 and 40),
  prova         text     not null check (length(btrim(prova)) between 2 and 80),
  ano           smallint not null check (ano between 1990 and 2100),
  numero        smallint not null check (numero between 1 and 500),

  materia       text     not null check (length(btrim(materia)) between 2 and 60),
  -- `assunto` e NULO quando o classificador nao teve certeza. Nulo e resposta
  -- honesta: a cobertura medida as cegas foi 71%, e inventar assunto para os
  -- 29% restantes faria o filtro mentir, que e pior que o filtro nao ter tudo.
  assunto       text              check (assunto is null or length(btrim(assunto)) between 2 and 60),

  enunciado     text     not null check (length(btrim(enunciado)) >= 10),
  -- jsonb porque prova militar tem 4 ou 5 alternativas conforme a banca.
  alternativas  jsonb    not null check (jsonb_typeof(alternativas) = 'object'),
  gabarito      text     not null check (gabarito in ('a','b','c','d','e')),

  -- 🔴 Nasce falso. Ver decisao 3 no cabecalho.
  publicada     boolean  not null default false,
  -- O que a conferencia anotou: 'ok', 'figura', 'truncada', 'anulada'.
  revisao       text,

  criado_em     timestamptz not null default now(),

  -- Importar o mesmo PDF duas vezes nao duplica o acervo.
  unique (banca, ano, prova, numero)
);

-- O gabarito tem de ser uma das alternativas que existem. Sem isto uma questao
-- de 4 alternativas poderia ter gabarito 'e' e nunca ter resposta certa.
alter table public.questoes drop constraint if exists questoes_gabarito_existe;
alter table public.questoes add  constraint questoes_gabarito_existe
  check (alternativas ? gabarito);

create index if not exists questoes_filtro
  on public.questoes (materia, assunto, banca, ano) where publicada;

-- ── 2. QUEM PODE PUBLICAR ───────────────────────────────────────────────────
create table if not exists public.administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- ── 3. O QUE CADA UM JA VIU ────────────────────────────────────────────────
-- Serve para duas coisas: contar a amostra diaria do plano free, e (depois) o
-- caderno de erros do Q4. A chave e (usuario, questao), entao rever uma questao
-- antiga NAO gasta a cota do dia -- a cota e de questao NOVA.
create table if not exists public.questoes_servidas (
  usuario_id uuid   not null references auth.users(id) on delete cascade,
  questao_id bigint not null references public.questoes(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, questao_id)
);
create index if not exists questoes_servidas_dia
  on public.questoes_servidas (usuario_id, criado_em);

-- ── 4. FECHAR TUDO ──────────────────────────────────────────────────────────
-- RLS ligada nas tres, sem policy nenhuma: com os grants revogados a RLS e a
-- segunda linha de defesa, nao a primeira. Ver regra 2 de seguranca.
alter table public.questoes            enable row level security;
alter table public.administradores     enable row level security;
alter table public.questoes_servidas   enable row level security;

revoke all on public.questoes          from anon, authenticated;
revoke all on public.administradores   from anon, authenticated;
revoke all on public.questoes_servidas from anon, authenticated;

-- ============================================================================
-- AS FUNCOES -- a unica maneira de entrar ou sair da tabela
-- ============================================================================

-- ── E o dono? ───────────────────────────────────────────────────────────────
-- 🔴 Le auth.uid() aqui dentro. Se recebesse o id por parametro, qualquer
-- pessoa passaria o id do Lucas e viraria administradora.
create or replace function public.sou_administrador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores where usuario_id = auth.uid());
$$;

-- ── Publicar / atualizar questoes ──────────────────────────────────────────
-- Recebe o resultado conferido da tela de importacao. Faz upsert pela chave
-- natural (banca, ano, prova, numero), entao reimportar a mesma prova corrige
-- em vez de duplicar.
create or replace function public.publicar_questoes(p_questoes jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gravadas int := 0;
  v_item     jsonb;
begin
  if not public.sou_administrador() then
    raise exception 'apenas administrador publica questao'
      using errcode = '42501';
  end if;
  if jsonb_typeof(p_questoes) <> 'array' then
    raise exception 'esperava uma lista de questoes' using errcode = '22023';
  end if;
  -- Teto por chamada: protege contra um PDF absurdo travar a transacao.
  if jsonb_array_length(p_questoes) > 500 then
    raise exception 'no maximo 500 questoes por vez' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_questoes) loop
    insert into public.questoes
      (banca, prova, ano, numero, materia, assunto,
       enunciado, alternativas, gabarito, publicada, revisao)
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
      nullif(btrim(coalesce(v_item->>'revisao','')), '')
    )
    on conflict (banca, ano, prova, numero) do update set
      materia      = excluded.materia,
      assunto      = excluded.assunto,
      enunciado    = excluded.enunciado,
      alternativas = excluded.alternativas,
      gabarito     = excluded.gabarito,
      publicada    = excluded.publicada,
      revisao      = excluded.revisao;
    v_gravadas := v_gravadas + 1;
  end loop;

  return jsonb_build_object(
    'gravadas', v_gravadas,
    'total',    (select count(*) from public.questoes),
    'no_ar',    (select count(*) from public.questoes where publicada)
  );
end;
$$;

-- ── Os filtros da tela ─────────────────────────────────────────────────────
-- Devolve so o que EXISTE publicado. Oferecer "Matematica > Logaritmo" num
-- acervo que nao tem nenhuma questao de logaritmo e prometer o que nao ha.
create or replace function public.filtros_de_questoes()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from public.questoes where publicada),
    'bancas', coalesce((
      select jsonb_agg(x order by x->>'nome')
      from (select jsonb_build_object('nome', banca, 'quantas', count(*)) as x
            from public.questoes where publicada group by banca) b
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
          -- O assunto DENTRO da materia -- o filtro que ele pediu em 18/09:
          -- "as vezes ela quer estudar matematica, mas ela quer estudar sobre
          -- funcoes ou porcentagem".
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

-- ── Servir questao, com o portao do plano ──────────────────────────────────
-- 🔴 AQUI MORA A REGRA DE NEGOCIO INTEIRA. Ordem dele em 18/09: amostra gratis
-- para todo mundo, liberacao total so no Pro.
--
--   free  -> 10 questoes NOVAS por dia, e so de prova com 4 anos ou mais.
--            Os 10/dia empatam com o plano gratuito do Qconcursos, que e a
--            referencia que o concurseiro ja conhece (mesmo numero usado em
--            LIMITE_DIARIO no _shared/comum.ts).
--   beta  -> igual ao pro. Beta e promessa vitalicia de acesso pro.
--   pro   -> tudo, inclusive as provas recentes, que sao as que mais importam.
--
-- Rever questao ja vista NAO gasta cota: a chave de questoes_servidas e
-- (usuario, questao), entao o insert repetido nao cria linha nova.
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

  -- Teto de paginacao para todos, inclusive pro: nao e limite de produto, e
  -- para uma chamada sozinha nao arrastar o acervo inteiro.
  v_pedir := least(greatest(coalesce(p_limite, 10), 1), 50);

  if v_free then
    -- "provas de 4+ anos": a prova do ano passado e o que o Pro entrega.
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
             'gabarito', gabarito) as q
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
    -- A tela usa isto para dizer o que o Pro acrescenta, sem mentir o numero.
    'fora_da_amostra', case when v_free then (
      select count(*) from public.questoes
      where publicada and ano > v_ano_teto
        and (p_materia is null or materia = p_materia)
        and (p_assunto is null or assunto = p_assunto)
        and (p_banca   is null or banca   = p_banca)) else 0 end
  );
end;
$$;

-- ── O painel de quem importa ───────────────────────────────────────────────
-- A tela de conferencia precisa ver o que ja esta la, inclusive o que ainda
-- NAO foi publicado -- e isso ninguem mais pode ver.
create or replace function public.acervo_do_administrador()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_administrador() then
    raise exception 'apenas administrador' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total',   (select count(*) from public.questoes),
    'no_ar',   (select count(*) from public.questoes where publicada),
    'provas',  coalesce((
      select jsonb_agg(p order by p->>'ano' desc, p->>'prova')
      from (select jsonb_build_object(
                     'banca', banca, 'prova', prova, 'ano', ano,
                     'quantas', count(*),
                     'no_ar', count(*) filter (where publicada)) as p
            from public.questoes group by banca, prova, ano) pp
    ), '[]'::jsonb)
  );
end;
$$;

-- ── Privilegios: so execucao, e so para quem esta logado ───────────────────
revoke all on function public.sou_administrador()          from public, anon;
revoke all on function public.publicar_questoes(jsonb)     from public, anon;
revoke all on function public.filtros_de_questoes()        from public, anon;
revoke all on function public.acervo_do_administrador()    from public, anon;
revoke all on function public.sortear_questoes(text, text, text, int, int) from public, anon;

grant execute on function public.sou_administrador()       to authenticated;
grant execute on function public.publicar_questoes(jsonb)  to authenticated;
grant execute on function public.filtros_de_questoes()     to authenticated;
grant execute on function public.acervo_do_administrador() to authenticated;
grant execute on function public.sortear_questoes(text, text, text, int, int) to authenticated;

comment on table public.questoes is
  'Acervo de questoes de provas militares antigas. NINGUEM le direto: '
  'sortear_questoes() e a unica saida, e e nela que mora o portao free/pro.';
comment on table public.administradores is
  'Quem pode publicar questao. Nasce VAZIA -- a linha do dono entra por fora, '
  'com service_role, porque o repositorio e publico.';
comment on function public.publicar_questoes(jsonb) is
  'Unica porta de escrita do acervo. security definer, confere administrador '
  'por auth.uid(), nunca por parametro. Ver roadmap Q2.';
