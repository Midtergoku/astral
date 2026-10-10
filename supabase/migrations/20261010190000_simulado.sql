-- ============================================================================
-- SIMULADO (R4 do roadmap do RPG) -- 10/10/2026, guardado 5, "pode mandar bala" (dele)
--
-- Uma prova do edital da pessoa: N questoes do Banco, nas materias DELA e na proporcao do PESO de cada uma, sem
-- gabarito ate entregar, com relogio, e um relatorio no fim. Gratis por enquanto (recomendacao gravada): o corte do
-- Pro decide-se junto com o pagamento (5.3).
--
--   simulados                 o que foi montado e o resultado. RLS: so o dono le; escrita so pelas funcoes
--   questoes_servidas         + no_simulado: questao de simulado NAO gasta a amostra do dia do Banco (sortear_questoes)
--   montar_simulado(quantas)  10 a 50 questoes; as que a pessoa nunca respondeu primeiro; mesmas travas do Banco
--                             (prova antiga no gratis -- regra do plano, inalterada --, materia regional de outro
--                             estado nunca); ate 5 por dia (nao e para baixar o acervo inteiro)
--   entregar_simulado(id, respostas, segundos)  o SERVIDOR corrige: cada resposta passa por registrar_resposta (a
--                             mesma do Banco -- conta no dominio e no caderno de erros) e so DEPOIS o gabarito e a
--                             explicacao saem, para todas, inclusive as deixadas em branco
--   meus_dados                leva os simulados
-- XP: nenhum. XP e tempo de estudo (sessoes); questao mede DOMINIO (a regra do guia da tela).
-- ============================================================================

alter table public.questoes_servidas add column if not exists no_simulado boolean not null default false;

create table if not exists public.simulados (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  questoes    bigint[] not null,
  entregue_em timestamptz,
  segundos    integer check (segundos is null or segundos between 0 and 86400),
  acertos     integer,
  respondidas integer,
  resultado   jsonb
);
create index if not exists simulados_do_usuario on public.simulados (usuario_id, criado_em desc);
alter table public.simulados enable row level security;
drop policy if exists "le_os_proprios_simulados" on public.simulados;
create policy "le_os_proprios_simulados" on public.simulados for select to authenticated using (usuario_id = auth.uid());
revoke all on public.simulados from public, anon, authenticated;
grant select on public.simulados to authenticated;

create or replace function public.montar_simulado(p_quantas integer default 20)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_plano   text;
  v_anos    int;
  v_teto    int;
  v_estado  text;
  v_n       int := least(greatest(coalesce(p_quantas, 20), 10), 50);
  v_hoje    int;
  v_ids     bigint[] := '{}';
  v_id      bigint;
  r         record;
  v_soma    numeric;
  v_resto   int;
begin
  if v_uid is null then raise exception 'precisa estar logado' using errcode = '42501'; end if;
  select count(*) into v_hoje from public.simulados
   where usuario_id = v_uid and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if v_hoje >= 5 then
    raise exception 'Você já montou 5 simulados hoje. Amanhã tem mais.' using errcode = '54000';
  end if;
  select coalesce(tipo_plano, 'free') into v_plano from public.perfis where id = v_uid;
  v_anos   := coalesce(public.limite_do_plano(coalesce(v_plano, 'free'), 'questoes_anos_minimo'), 0);
  v_teto   := extract(year from (now() at time zone 'America/Sao_Paulo'))::int - v_anos;
  v_estado := public.meu_estado();

  -- as materias do edital que TEM questao no Banco (com as travas), com o peso de cada uma
  create temporary table if not exists _sim_mat (materia text primary key, peso numeric, disponiveis int, cota int) on commit drop;
  truncate _sim_mat;
  insert into _sim_mat (materia, peso, disponiveis, cota)
  select b.materia, sum(b.peso), max(b.disp), 0
    from (
      select public.materia_do_banco(m ->> 'nome') as materia,
             case when (m ->> 'peso') ~ '^[0-9]+([.][0-9]+)?$' and (m ->> 'peso')::numeric > 0 then (m ->> 'peso')::numeric else 1 end as peso,
             (select count(*) from public.questoes q
               where q.publicada and q.gabarito is not null and q.materia = public.materia_do_banco(m ->> 'nome')
                 and (v_anos = 0 or q.ano <= v_teto)
                 and not (q.estado is not null and q.estado is distinct from v_estado and public.materia_regional(q.materia)))::int as disp
        from public.progresso p, jsonb_array_elements(coalesce(p.materias, '[]'::jsonb)) m
       where p.usuario_id = v_uid
    ) b
   where b.materia is not null and b.disp > 0
   group by b.materia;
  if not exists (select 1 from _sim_mat) then
    raise exception 'As matérias do seu edital ainda não têm questões no Banco.' using errcode = '22023';
  end if;

  -- cota de cada materia: proporcional ao peso (maiores restos), sem passar do que ha no Banco
  select sum(peso) into v_soma from _sim_mat;
  -- "where true": o Supabase recusa UPDATE sem WHERE (safeupdate), mesmo em tabela temporaria
  update _sim_mat set cota = least(disponiveis, floor(v_n * peso / v_soma)::int) where true;
  v_resto := v_n - (select sum(cota) from _sim_mat);
  while v_resto > 0 and exists (select 1 from _sim_mat where cota < disponiveis) loop
    update _sim_mat set cota = cota + 1
     where materia = (select materia from _sim_mat where cota < disponiveis
                      order by (v_n * peso / v_soma) - cota desc, peso desc limit 1);
    v_resto := v_resto - 1;
  end loop;

  -- as questoes: por materia, as NUNCA respondidas primeiro; as do estado do aluno antes; o resto sorteado
  for r in select materia, cota from _sim_mat where cota > 0 loop
    v_ids := v_ids || array(
      select q.id from public.questoes q
       where q.publicada and q.gabarito is not null and q.materia = r.materia
         and (v_anos = 0 or q.ano <= v_teto)
         and not (q.estado is not null and q.estado is distinct from v_estado and public.materia_regional(q.materia))
       order by exists (select 1 from public.respostas rr where rr.usuario_id = v_uid and rr.questao_id = q.id),
                (v_estado is not null and q.estado is not distinct from v_estado) desc,
                random()
       limit r.cota);
  end loop;

  insert into public.simulados (usuario_id, questoes) values (v_uid, v_ids) returning id into v_id;
  -- servidas (a trava do registrar_resposta), marcadas como de simulado: nao gastam a amostra do Banco
  insert into public.questoes_servidas (usuario_id, questao_id, no_simulado)
  select v_uid, unnest(v_ids), true
  on conflict (usuario_id, questao_id) do nothing;

  return jsonb_build_object('id', v_id, 'plano', v_plano, 'questoes', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', q.id, 'banca', q.banca, 'prova', q.prova, 'ano', q.ano, 'numero', q.numero,
             'materia', q.materia, 'assunto', q.assunto, 'enunciado', q.enunciado, 'alternativas', q.alternativas,
             'tipo', q.tipo, 'texto_apoio', q.texto_apoio, 'imagem', q.imagem)
             order by array_position(v_ids, q.id)), '[]'::jsonb)
      from public.questoes q where q.id = any(v_ids)));
end;
$$;
revoke all on function public.montar_simulado(integer) from public, anon;
grant execute on function public.montar_simulado(integer) to authenticated;

create or replace function public.entregar_simulado(p_id bigint, p_respostas jsonb, p_segundos integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  s       public.simulados;
  v_qid   bigint;
  v_letra text;
  v_res   jsonb;
  v_itens jsonb := '[]'::jsonb;
  v_ac    int := 0;
  v_resp  int := 0;
  q       record;
begin
  if v_uid is null then raise exception 'precisa estar logado' using errcode = '42501'; end if;
  select * into s from public.simulados where id = p_id and usuario_id = v_uid for update;
  if not found then raise exception 'simulado nao encontrado' using errcode = '22023'; end if;
  if s.entregue_em is not null then raise exception 'este simulado ja foi entregue' using errcode = '22023'; end if;

  foreach v_qid in array s.questoes loop
    v_letra := lower(btrim(coalesce(p_respostas ->> v_qid::text, '')));
    select id, materia, assunto, gabarito, explicacao into q from public.questoes where id = v_qid;
    if v_letra in ('a','b','c','d','e') then
      -- a MESMA correcao do Banco: grava a resposta (dominio, caderno de erros) e so entao devolve o gabarito
      v_res := public.registrar_resposta('acervo', v_qid, v_letra);
      v_resp := v_resp + 1;
      if coalesce((v_res ->> 'acertou')::boolean, false) then v_ac := v_ac + 1; end if;
    else
      v_letra := null;
      v_res := null;
    end if;
    v_itens := v_itens || jsonb_build_object(
      'id', v_qid, 'materia', q.materia, 'assunto', q.assunto, 'letra', v_letra,
      'gabarito', q.gabarito, 'explicacao', q.explicacao,
      'acertou', coalesce((v_res ->> 'acertou')::boolean, false));
  end loop;

  update public.simulados set entregue_em = now(), segundos = least(greatest(coalesce(p_segundos, 0), 0), 86400),
         acertos = v_ac, respondidas = v_resp,
         resultado = jsonb_build_object('por_materia', (
           select coalesce(jsonb_object_agg(materia, jsonb_build_object('acertos', ac, 'total', tot)), '{}'::jsonb)
             from (select i ->> 'materia' as materia, count(*) filter (where (i ->> 'acertou')::boolean) as ac, count(*) as tot
                     from jsonb_array_elements(v_itens) i group by 1) x))
   where id = p_id;

  return jsonb_build_object('id', p_id, 'acertos', v_ac, 'respondidas', v_resp, 'total', coalesce(array_length(s.questoes, 1), 0),
    'segundos', least(greatest(coalesce(p_segundos, 0), 0), 86400), 'itens', v_itens,
    'por_materia', (select resultado -> 'por_materia' from public.simulados where id = p_id));
end;
$$;
revoke all on function public.entregar_simulado(bigint, jsonb, integer) from public, anon;
grant execute on function public.entregar_simulado(bigint, jsonb, integer) to authenticated;

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
      and not no_simulado   -- 10/10/2026: questao de SIMULADO nao gasta a amostra do dia do Banco
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

CREATE OR REPLACE FUNCTION public.meus_dados()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid   uuid := auth.uid();
  conta auth.users%rowtype;
  -- Toda tabela com usuario_id entra aqui. Tabela nova com dado do aluno?
  -- Acrescentar na lista -- o tools/testa-dados-do-aluno.js FALHA se uma
  -- tabela com usuario_id ficar de fora.
  tabelas text[] := array[
    'progresso', 'sessoes_estudo', 'eventos', 'conquistas', 'habilidades_escolhidas',
    'respostas', 'questoes_minhas', 'questoes_servidas', 'recursos_salvos',
    'taf_registros', 'uso_ia', 'consentimentos', 'erros_cliente', 'administradores',
    -- 03/10/2026: os erros que a pessoa reportou nas questoes (BAN-02)
    'questoes_reportadas',
    -- 03/10/2026: as etapas do funil e a origem do cadastro (NEG-01)
    'funil',
    -- 03/10/2026: "a leitura do edital esta errada" (EDI-03)
    'editais_reportados',
    -- 10/10/2026: o "Passei!" -- a aprovacao e o depoimento (roadmap 3.22)
    'aprovacoes',
    -- 10/10/2026: os assuntos que a pessoa marcou como estudados
    'assuntos_estudados',
    -- 10/10/2026: os simulados (R4) e o resultado de cada um
    'simulados'];
  t text;
  linhas jsonb;
  pacote jsonb;
begin
  if uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  select * into conta from auth.users where id = uid;

  pacote := jsonb_build_object(
    'exportado_em', now(),
    'origem', 'Astral — astral-psi.vercel.app',
    'conta', jsonb_build_object(
      'id', conta.id, 'email', conta.email, 'criada_em', conta.created_at,
      'ultimo_acesso', conta.last_sign_in_at,
      'forma_de_acesso', coalesce(conta.raw_app_meta_data->>'provider', 'email'),
      'nome', conta.raw_user_meta_data->>'full_name'),
    'perfil', (select to_jsonb(p) from public.perfis p where p.id = uid),
    'lista_de_espera', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
                          from public.lista_espera l where lower(l.email) = lower(conta.email)),
    'historico_de_plano', (select coalesce(jsonb_agg(jsonb_build_object(
                              'evento', a.evento, 'detalhe', a.detalhe, 'em', a.criado_em) order by a.criado_em), '[]'::jsonb)
                             from public.auditoria a where a.alvo_id = uid));

  foreach t in array tabelas loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.usuario_id = $1', t)
      into linhas using uid;
    pacote := pacote || jsonb_build_object(t, linhas);
  end loop;

  return pacote;
end;
$function$;
