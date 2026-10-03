-- ============================================================================
-- Corrigir a leitura do edital (03/10/2026)
-- Auditoria EDI-02 + EDI-03 -- roadmap 3.3.
--
-- EDI-02: se a IA errasse uma materia, um peso ou a data, o aluno so podia
-- remover ou trocar o edital (e subir o mesmo PDF devolvia a mesma leitura,
-- do cache). Agora ele corrige no proprio painel. Peso e data moram em
-- progresso.edital/materias e ja eram gravados pelo salvar_progresso -- o
-- que faltava no SERVIDOR e o RENOMEAR:
--
--   o tempo estudado e ligado a materia pelo NOME EXATO
--   (dominio_calculado: est.materia = ed.m->>'nome'). Renomear "Matematica"
--   para "Matemática" so na lista deixaria as horas antigas orfas -- o
--   dominio cairia. renomear_materias() leva as sessoes (e os recursos
--   salvos, que tambem sao por nome) junto, numa transacao so.
--
--   Travas, porque sessao e prova de estudo e alimenta condecoracao:
--     - so renomeia materia que ESTA no edital da pessoa (sessao fora do
--       edital vira 'Geral' na amplitude -- nao pode virar materia do edital)
--     - o nome novo nao pode ser de OUTRA materia do edital, nem de outra
--       sessao ja gravada: juntar duas materias numa inflaria "a mesma
--       materia N dias seguidos"
--   Comparacao sem acento e sem caixa (unaccent_simples), como os fatos.
--
-- EDI-03: a leitura fica guardada por arquivo (editais_lidos) e serve a todos
-- que subirem o mesmo PDF. "A leitura esta errada" NAO apaga a guardada:
-- um aluno apagaria a de todos, e cada releitura custa credito de IA. O relato
-- fica aqui; o checa-saude avisa; o dono confere e decide.
-- ============================================================================

create table if not exists public.editais_reportados (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  edital_hash  text not null check (edital_hash ~ '^[0-9a-f]{64}$'),
  concurso     text check (concurso is null or char_length(concurso) <= 160),
  detalhe      text check (detalhe is null or char_length(detalhe) <= 500),
  criado_em    timestamptz not null default now(),
  resolvido_em timestamptz,
  unique (usuario_id, edital_hash)
);
create index if not exists editais_reportados_abertos on public.editais_reportados (criado_em) where resolvido_em is null;

alter table public.editais_reportados enable row level security;
revoke all on public.editais_reportados from anon, authenticated;
grant select, insert (edital_hash, concurso, detalhe) on public.editais_reportados to authenticated;

drop policy if exists "dono le seus relatos de edital" on public.editais_reportados;
create policy "dono le seus relatos de edital" on public.editais_reportados
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "dono reporta edital" on public.editais_reportados;
create policy "dono reporta edital" on public.editais_reportados
  for insert to authenticated with check ((select auth.uid()) = usuario_id);

-- ── renomear materias do edital, levando o que foi estudado nelas ───────────
-- Recebe TODAS as trocas de uma vez ([{"de": "...", "para": "..."}]) e faz
-- tudo numa transacao: ou todas entram, ou nenhuma. Renomeia nas sessoes, nos
-- recursos salvos e na propria lista do edital (progresso.materias) -- assim
-- uma falha da gravacao seguinte da tela nao deixa horas orfas.
create or replace function public.renomear_materias(p_trocas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lista jsonb;
  v_trocas jsonb := '[]'::jsonb;
  t jsonb;
  v_de text;
  v_para text;
  v_sessoes integer := 0;
  v_recursos integer := 0;
  n integer;
begin
  if v_uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  if jsonb_typeof(p_trocas) <> 'array' or jsonb_array_length(p_trocas) > 40 then
    raise exception 'Lista de trocas invalida.' using errcode = '22023';
  end if;

  select materias into v_lista from public.progresso where usuario_id = v_uid;
  v_lista := coalesce(v_lista, '[]'::jsonb);

  -- 1. conferir TODAS antes de mexer em qualquer uma
  for t in select * from jsonb_array_elements(p_trocas) loop
    v_de := t->>'de';
    v_para := btrim(coalesce(t->>'para', ''));
    if v_de is null or v_de = v_para then continue; end if;
    if char_length(v_para) < 1 or char_length(v_para) > 120 then
      raise exception 'O nome da materia precisa ter de 1 a 120 letras.' using errcode = '22023';
    end if;
    if not exists (select 1 from jsonb_array_elements(v_lista) m where m->>'nome' = v_de) then
      raise exception 'A materia "%" nao esta no seu edital.', v_de using errcode = '22023';
    end if;
    -- nome de OUTRA materia do edital (inclusive uma que tambem vai ser renomeada:
    -- troca cruzada de nomes fica para duas correcoes)
    if exists (select 1 from jsonb_array_elements(v_lista) m
                where m->>'nome' <> v_de
                  and lower(unaccent_simples(m->>'nome')) = lower(unaccent_simples(v_para))) then
      raise exception 'Ja existe outra materia chamada "%" no seu edital.', v_para using errcode = '22023';
    end if;
    -- estudo ja gravado com esse nome em outra materia: juntar duas materias
    -- inflaria "a mesma materia N dias seguidos"
    if exists (select 1 from public.sessoes_estudo s
                where s.usuario_id = v_uid and s.materia <> v_de
                  and lower(unaccent_simples(s.materia)) = lower(unaccent_simples(v_para))) then
      raise exception 'Voce ja tem estudo gravado como "%" em outra materia.', v_para using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(v_trocas) o
                where o->>'de' = v_de
                   or lower(unaccent_simples(o->>'para')) = lower(unaccent_simples(v_para))) then
      raise exception 'Duas trocas com o mesmo nome: "%".', v_para using errcode = '22023';
    end if;
    v_trocas := v_trocas || jsonb_build_array(jsonb_build_object('de', v_de, 'para', v_para));
  end loop;

  if jsonb_array_length(v_trocas) = 0 then
    return jsonb_build_object('trocas', 0, 'sessoes', 0, 'recursos', 0);
  end if;

  -- 2. aplicar
  for t in select * from jsonb_array_elements(v_trocas) loop
    update public.sessoes_estudo set materia = t->>'para'
     where usuario_id = v_uid and materia = t->>'de';
    get diagnostics n = row_count;
    v_sessoes := v_sessoes + n;

    update public.recursos_salvos r set materia = t->>'para'
     where r.usuario_id = v_uid and r.materia = t->>'de'
       and not exists (select 1 from public.recursos_salvos o
                        where o.usuario_id = v_uid and o.materia = t->>'para');
    get diagnostics n = row_count;
    v_recursos := v_recursos + n;
  end loop;

  update public.progresso p set materias = (
    select coalesce(jsonb_agg(
             case when tr.para is not null then m || jsonb_build_object('nome', tr.para) else m end
             order by x.ord), '[]'::jsonb)
      from jsonb_array_elements(p.materias) with ordinality as x(m, ord)
      left join lateral (
        select o->>'para' as para from jsonb_array_elements(v_trocas) o
         where o->>'de' = x.m->>'nome' limit 1) tr on true)
   where p.usuario_id = v_uid;

  return jsonb_build_object('trocas', jsonb_array_length(v_trocas), 'sessoes', v_sessoes, 'recursos', v_recursos);
end;
$$;
revoke all on function public.renomear_materias(jsonb) from public, anon;
grant execute on function public.renomear_materias(jsonb) to authenticated;

-- O pacote "Baixar meus dados" (LGL-03) leva os relatos de edital tambem.
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
    'editais_reportados'];
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
