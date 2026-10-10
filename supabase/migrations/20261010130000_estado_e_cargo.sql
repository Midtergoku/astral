-- ============================================================================
-- CADA ESTADO E CADA CARGO E UM CONCURSO DIFERENTE (10/10/2026 -- pedido dele de 03/10, roadmap 3.25)
--
-- Ele: "e desnecessario uma pessoa do Rio de Janeiro estudar para o concurso do Rio
-- de Janeiro e cair uma materia que so cai na prova de oficial do Acre".
-- Medido em 03/10 e de novo em 10/10: o edital e o cronograma ja sao de cada pessoa;
-- o BANCO nao sabia de estado nem de cargo. Hoje: EEAR 1.682 (nacional), CBMES 96
-- (Espirito Santo -- 15 de Historia/Geografia), Cebraspe/PRF 73 (federal: a legislacao
-- de transito e nacional), ESA 55 (nacional).
--
--   questoes.estado   UF da prova (null = nacional). questoes.cargo: soldado, cabo,
--                     sargento, oficial, policial, outro.
--   materia_regional  legislacao, historia, geografia -- as que mudam de estado para estado
--   estado_do_concurso(nome)  UF pelo nome do edital (CBMERJ, PMESP, "Bombeiro Militar
--                     do Espirito Santo"...); federal ou nao reconhecido = null
--   meu_estado()      o estado do concurso do aluno logado
--   sortear_questoes  NUNCA mostra materia regional de prova de outro estado; as do
--                     mesmo estado vem primeiro. (Gerada da definicao em producao.)
-- Concursos federais (EEAR, ESA, EsPCEx, EFOMM, ITA, Colegio Naval, PRF, PF) sao um so
-- no pais inteiro.
-- ============================================================================

alter table public.questoes add column if not exists estado text
  check (estado is null or estado in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'));
alter table public.questoes add column if not exists cargo text
  check (cargo is null or cargo in ('soldado', 'cabo', 'sargento', 'oficial', 'policial', 'outro'));

-- o acervo de hoje, medido (10/10/2026)
update public.questoes set estado = 'ES', cargo = 'soldado' where banca = 'CBMES' and estado is null;
update public.questoes set cargo = 'sargento' where banca in ('EEAR', 'ESA') and cargo is null;
update public.questoes set cargo = 'policial' where banca = 'Cebraspe' and prova ilike '%PRF%' and cargo is null;

create or replace function public.materia_regional(p_materia text)
returns boolean language sql immutable set search_path = public as $$
  select lower(public.unaccent_simples(coalesce(p_materia, ''))) ~ '^(legisla|hist|geogr)';
$$;

create or replace function public.estado_do_concurso(p_nome text)
returns text language plpgsql immutable set search_path = public as $$
declare
  n text := upper(public.unaccent_simples(coalesce(p_nome, '')));
  m text[];
  nomes constant jsonb := '{"ACRE":"AC","ALAGOAS":"AL","AMAPA":"AP","AMAZONAS":"AM","BAHIA":"BA","CEARA":"CE",
    "DISTRITO FEDERAL":"DF","ESPIRITO SANTO":"ES","GOIAS":"GO","MARANHAO":"MA","MATO GROSSO DO SUL":"MS",
    "MATO GROSSO":"MT","MINAS GERAIS":"MG","PARAIBA":"PB","PARANA":"PR","PERNAMBUCO":"PE","PIAUI":"PI",
    "RIO DE JANEIRO":"RJ","RIO GRANDE DO NORTE":"RN","RIO GRANDE DO SUL":"RS","RONDONIA":"RO","RORAIMA":"RR",
    "SANTA CATARINA":"SC","SAO PAULO":"SP","SERGIPE":"SE","TOCANTINS":"TO","PARA":"PA"}';
  k text;
begin
  if n = '' then return null; end if;
  -- sigla: CBM/PM + (E) + UF -- CBMERJ, PMESP, CBMES, PMMG, CBMDF
  m := regexp_match(n, '(?:^|[^A-Z])(?:CBM|PM)E?([A-Z]{2})(?:[^A-Z]|$)');
  if m is not null and m[1] in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then return m[1]; end if;
  -- nome do estado escrito (os compostos primeiro: "MATO GROSSO DO SUL" antes de "MATO GROSSO", "PARA" por ultimo)
  for k in select key from jsonb_each_text(nomes) order by length(key) desc loop
    if n ~ ('(^|[^A-Z])' || k || '([^A-Z]|$)') then return nomes->>k; end if;
  end loop;
  return null;
end;
$$;

create or replace function public.meu_estado()
returns text language sql stable security definer set search_path = public as $$
  select public.estado_do_concurso(p.edital->>'nome') from public.progresso p where p.usuario_id = auth.uid();
$$;
revoke all on function public.meu_estado() from public, anon;
grant execute on function public.meu_estado() to authenticated;

CREATE OR REPLACE FUNCTION public.sortear_questoes(p_materia text DEFAULT NULL::text, p_assunto text DEFAULT NULL::text, p_banca text DEFAULT NULL::text, p_ano integer DEFAULT NULL::integer, p_limite integer DEFAULT 10, p_prova text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_plano     text;
  v_por_dia   int;
  v_anos      int;
  v_amostra   boolean;
  v_ano_teto  int;
  v_hoje      int;
  v_restam    int;
  v_pedir     int;
  v_ids       bigint[];
  v_saida     jsonb;
  v_estado    text;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;

  select coalesce(tipo_plano, 'free') into v_plano from public.perfis where id = v_uid;
  v_plano   := coalesce(v_plano, 'free');
  v_por_dia := public.limite_do_plano(v_plano, 'questoes_por_dia');
  v_anos    := coalesce(public.limite_do_plano(v_plano, 'questoes_anos_minimo'), 0);
  -- "amostra" = o plano tem teto por dia ou so prova antiga (hoje: o grátis).
  v_amostra := v_por_dia is not null or v_anos > 0;
  v_pedir   := least(greatest(coalesce(p_limite, 10), 1), 50);
  -- 10/10/2026 (roadmap 3.25): o estado do concurso do aluno (null = federal ou nao reconhecido)
  v_estado  := public.meu_estado();

  if v_amostra then
    v_ano_teto := extract(year from (now() at time zone 'America/Sao_Paulo'))::int - v_anos;
    select count(*) into v_hoje
    from public.questoes_servidas
    where usuario_id = v_uid
      and (criado_em at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date;
    if v_por_dia is not null then
      v_restam := greatest(v_por_dia - v_hoje, 0);
      if v_restam = 0 then
        return jsonb_build_object(
          'questoes', '[]'::jsonb, 'plano', v_plano, 'acabou', true,
          'vistas_hoje', v_hoje, 'limite_do_dia', v_por_dia,
          'motivo', 'A amostra de hoje acabou. No Pro as questões são liberadas por inteiro.');
      end if;
      v_pedir := least(v_pedir, v_restam);
    end if;
  end if;

  select coalesce(jsonb_agg(q order by q->>'numero'), '[]'::jsonb),
         coalesce(array_agg((q->>'id')::bigint), '{}')
    into v_saida, v_ids
  from (
    select jsonb_build_object(
             'id', id, 'banca', banca, 'prova', prova, 'ano', ano,
             'numero', numero, 'materia', materia, 'assunto', assunto,
             'enunciado', enunciado, 'alternativas', alternativas,
             'tem_gabarito', gabarito is not null,
             'tipo', tipo, 'texto_apoio', texto_apoio, 'imagem', imagem) as q
    from public.questoes
    where publicada
      and (p_materia is null or materia = p_materia)
      and (p_assunto is null or assunto = p_assunto)
      and (p_banca   is null or banca   = p_banca)
      and (p_prova   is null or prova   = p_prova)
      and (p_ano     is null or ano     = p_ano)
      and (v_anos = 0 or ano <= v_ano_teto)
      -- 3.25: materia REGIONAL (legislacao, historia, geografia) de prova de OUTRO estado nunca aparece
      and not (estado is not null and estado is distinct from v_estado and public.materia_regional(materia))
    -- 3.25: as do mesmo estado do aluno primeiro; o resto, sorteado
    order by (v_estado is not null and estado is not distinct from v_estado) desc, random()  -- 3.25: "is not distinct" e nao "=": com estado vazio o "=" da NULO, e em DESC o nulo vem ANTES do verdadeiro (medido no dev)
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
    'vistas_hoje', case when v_por_dia is not null then v_hoje + coalesce(array_length(v_ids,1),0) else null end,
    'limite_do_dia', v_por_dia,
    'fora_da_amostra', case when v_anos > 0 then (
      select count(*) from public.questoes
      where publicada and ano > v_ano_teto
        and (p_materia is null or materia = p_materia)
        and (p_assunto is null or assunto = p_assunto)
        and (p_banca   is null or banca   = p_banca)
        and (p_prova   is null or prova   = p_prova)
        and not (estado is not null and estado is distinct from v_estado and public.materia_regional(materia))) else 0 end);
end;
$function$;

-- 10/10/2026 (3.25): o cargo pelo nome da banca e da prova (null = nao deu para saber -- o admin corrige)
create or replace function public.cargo_da_prova(p_banca text, p_prova text)
returns text language sql immutable set search_path = public as $$
  select case
    when n ~ '(^|[^A-Z])(CFSD|SOLDADO|CFP)([^A-Z]|$)'                       then 'soldado'
    when n ~ '(^|[^A-Z])(CABO|CFC)([^A-Z]|$)'                               then 'cabo'
    when n ~ '(^|[^A-Z])(CFS|EAGS|CFGS|SARGENTO|EEAR|ESA|CFSA)([^A-Z]|$)'  then 'sargento'
    when n ~ '(^|[^A-Z])(CFO|OFICIAL|ESPCEX|AFA|EFOMM|EN|ITA|IME|EFOM)([^A-Z]|$)' then 'oficial'
    when n ~ '(^|[^A-Z])(PRF|PF|POLICIAL|AGENTE|ESCRIVAO|INSPETOR)([^A-Z]|$)' then 'policial'
    else null end
  from (select upper(public.unaccent_simples(coalesce(p_banca, '') || ' ' || coalesce(p_prova, ''))) n) x;
$$;

-- publicar_questoes (importar.html e tools/importa-provas.js): grava estado e cargo -- o que vier, ou deduzido.
-- Gerada da definicao em producao.
CREATE OR REPLACE FUNCTION public.publicar_questoes(p_questoes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
       gabarito, publicada, revisao, explicacao, tipo, texto_apoio, estado, cargo)
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
      nullif(btrim(coalesce(v_item->>'texto_apoio','')), ''),
      -- 10/10/2026 (3.25): estado e cargo -- o que vier na questao, ou deduzido da banca e da prova
      coalesce(nullif(upper(btrim(coalesce(v_item->>'estado',''))), ''), public.estado_do_concurso(coalesce(v_item->>'banca','') || ' ' || coalesce(v_item->>'prova',''))),
      coalesce(nullif(lower(btrim(coalesce(v_item->>'cargo',''))), ''), public.cargo_da_prova(v_item->>'banca', v_item->>'prova'))
    )
    on conflict (banca, ano, prova, numero) do update set
      materia = excluded.materia, assunto = excluded.assunto,
      enunciado = excluded.enunciado, alternativas = excluded.alternativas,
      gabarito = excluded.gabarito, publicada = excluded.publicada,
      revisao = excluded.revisao,
      explicacao = coalesce(excluded.explicacao, public.questoes.explicacao),
      tipo = excluded.tipo, texto_apoio = excluded.texto_apoio,
      estado = coalesce(excluded.estado, public.questoes.estado),
      cargo = coalesce(excluded.cargo, public.questoes.cargo);
    v_gravadas := v_gravadas + 1;
  end loop;

  return jsonb_build_object('gravadas', v_gravadas,
    'total', (select count(*) from public.questoes),
    'no_ar', (select count(*) from public.questoes where publicada));
end;
$function$;
