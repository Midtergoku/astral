-- ============================================================================
-- Os ASSUNTOS de cada materia do edital, e o aluno marca o que ja estudou (10/10/2026)
--
-- Pedido dele, olhando Progresso > Materias do edital: Quimica e Informatica nao mostravam nenhum
-- assunto, porque a lista vinha SO do Banco de questoes. "Nao e porque nao tem uma questao no banco
-- que nao vai ter ali mostrando a submateria (...) aquilo ali e para a pessoa se organizar, poder
-- marcar se ela ja estudou ou nao."
--
--   1. assuntos_estudados: o que o aluno MARCOU como estudado. So o dono le e grava; a escrita e so
--      por marcar_assunto() (valida tamanho e se a materia e mesmo do edital dele).
--   2. materias_estudadas(): passa a devolver, por materia, os assuntos que a IA leu do EDITAL
--      ('assuntos_edital', do conteudo programatico) e os que o aluno marcou ('marcados').
--   3. meus_dados(): a tabela nova entra no "baixar meus dados".
--
-- 🔴 A MARCACAO NAO DA XP, DOMINIO NEM MEDALHA. Ela organiza o estudo e mostra o progresso, mas e
-- declaracao -- se valesse ponto, era o atalho que a auditoria fechou no 3.12 ("22 medalhas
-- declaradas"). O dominio continua vindo das questoes e do tempo de estudo.
-- ============================================================================

create table if not exists public.assuntos_estudados (
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  materia     text not null check (char_length(materia) between 1 and 120),
  assunto     text not null check (char_length(assunto) between 1 and 160),
  marcado_em  timestamptz not null default now(),
  primary key (usuario_id, materia, assunto)
);
alter table public.assuntos_estudados enable row level security;

-- leitura: so as proprias linhas. Escrita: so pela funcao (sem grant de insert/update/delete).
drop policy if exists "le_os_proprios_assuntos" on public.assuntos_estudados;
create policy "le_os_proprios_assuntos" on public.assuntos_estudados
  for select to authenticated using (usuario_id = auth.uid());
revoke all on public.assuntos_estudados from public, anon, authenticated;
grant select on public.assuntos_estudados to authenticated;

-- marcar_assunto: liga ou desliga "ja estudei este assunto". A materia tem de estar no edital da pessoa.
-- Teto de 2.000 marcas por conta (um edital grande tem ~300 assuntos): nada de encher a tabela.
create or replace function public.marcar_assunto(p_materia text, p_assunto text, p_estudado boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_mat text := btrim(coalesce(p_materia, ''));
  v_ass text := btrim(regexp_replace(coalesce(p_assunto, ''), '\s+', ' ', 'g'));
begin
  if v_uid is null then raise exception 'sem sessao' using errcode = '42501'; end if;
  if char_length(v_mat) not between 1 and 120 or char_length(v_ass) not between 1 and 160 then
    raise exception 'assunto invalido' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.progresso p, jsonb_array_elements(coalesce(p.materias, '[]'::jsonb)) m
     where p.usuario_id = v_uid and m ->> 'nome' = v_mat
  ) then
    raise exception 'esta materia nao esta no seu edital' using errcode = '22023';
  end if;
  if coalesce(p_estudado, false) then
    if (select count(*) from public.assuntos_estudados where usuario_id = v_uid) >= 2000 then
      raise exception 'limite de assuntos marcados' using errcode = '54000';
    end if;
    insert into public.assuntos_estudados (usuario_id, materia, assunto) values (v_uid, v_mat, v_ass)
      on conflict do nothing;
  else
    delete from public.assuntos_estudados where usuario_id = v_uid and materia = v_mat and assunto = v_ass;
  end if;
  return jsonb_build_object('materia', v_mat, 'assunto', v_ass, 'estudado', coalesce(p_estudado, false));
end;
$$;
revoke all on function public.marcar_assunto(text, text, boolean) from public, anon;
grant execute on function public.marcar_assunto(text, text, boolean) to authenticated;

-- materias_estudadas: a de 09/10 (3.27) + 'assuntos_edital' e 'marcados'
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
  ),
  marc as (
    select materia, jsonb_agg(assunto order by marcado_em) as marcados
      from public.assuntos_estudados where usuario_id = auth.uid() group by materia
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'nome',        l.m ->> 'nome',
           'dominio',     coalesce((l.m ->> 'progresso')::numeric, 0),
           'minutos',     round(coalesce(e.minutos, 0))::integer,
           'respondidas', coalesce((l.m -> 'medida' ->> 'respondidas')::integer, 0),
           'banco',       l.banco,
           'assuntos_edital', case when jsonb_typeof(l.m -> 'assuntos') = 'array' then l.m -> 'assuntos' else '[]'::jsonb end,
           'marcados',    coalesce(mc.marcados, '[]'::jsonb),
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
    left join est e on e.materia = l.m ->> 'nome'
    left join marc mc on mc.materia = l.m ->> 'nome';
$$;
revoke all on function public.materias_estudadas() from public, anon;
grant execute on function public.materias_estudadas() to authenticated;

-- meus_dados: a tabela nova entra no pacote (o testa-dados-do-aluno falha se ficar de fora)
create or replace function public.meus_dados()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
    'assuntos_estudados'];
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
