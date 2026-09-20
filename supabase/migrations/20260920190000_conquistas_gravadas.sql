-- ═══════════════════════════════════════════════════════════════════════════
-- AS CONQUISTAS, GRAVADAS PELO SERVIDOR
--
-- Decisoes dele em 20/09/2026, as tres de uma vez:
--
--   1. "faca o que achar melhor"     -> GRAVAR quando cai, nao recalcular
--   2. "o servidor vai gravar, nao quero ninguem alterando isso a nao ser nos"
--   3. "nao acontece nada porque quando o site for lancado ja tera essa
--       mecanica"                     -> nao ha migracao de dado antigo a fazer
--
-- ── POR QUE GRAVAR, E NAO SO CALCULAR ─────────────────────────────────────
-- Ate hoje a condecoracao era funcao pura dos fatos. Isso resolvia a fraude de
-- graca -- o que nao se guarda nao se falsifica -- mas criava um defeito que
-- medi em 19/09: TROCAR DE CONCURSO APAGA 4 CONDECORACOES e 3 divisas, porque
-- as que dependem do dominio das materias deixam de ser verdade quando as
-- materias viram outras.
--
-- Isso contraria a regra dele de 02/08, que o proprio `salvar_progresso` ja
-- respeita para os badges antigos: "conquista nao se desconquista".
--
-- Gravar resolve. E gravar SO PELO SERVIDOR resolve sem reabrir a fraude.
--
-- ── COMO A ESCRITA FICA FECHADA ───────────────────────────────────────────
-- A tabela nao da `insert`, `update` nem `delete` a ninguem -- nem a
-- `authenticated`. A unica porta e `sincronizar_conquistas()`, que e
-- `security definer`: ela roda com o dono do banco e por isso consegue
-- gravar, mas grava SOMENTE o que ela mesma calculou, para `auth.uid()`.
--
-- 🔴 O cuidado que `security definer` exige, e que ja derrubou projeto por ai:
--    - `set search_path = public` fixo, para ninguem plantar uma funcao com o
--      mesmo nome num esquema que venha antes;
--    - `auth.uid()` lido UMA vez no inicio e usado em toda parte -- a funcao
--      nunca aceita um id vindo de fora, porque aceitar seria dar a qualquer
--      um o poder de gravar conquista na conta alheia.
--
-- ── E AS CONQUISTAS NUNCA SAO APAGADAS ────────────────────────────────────
-- A funcao so faz `insert ... on conflict do nothing`. Nao existe `delete`
-- nem `update` no corpo dela. Mesmo que a pessoa troque de concurso e o
-- calculo deixe de dar verdadeiro, a linha gravada fica.

-- ── 1. A TABELA ────────────────────────────────────────────────────────────
create table if not exists public.conquistas (
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  tipo           text not null check (tipo in ('condecoracao', 'divisa')),
  item_id        text not null,
  conquistada_em timestamptz not null default now(),
  primary key (usuario_id, tipo, item_id)
);

create index if not exists conquistas_por_usuario
  on public.conquistas (usuario_id, conquistada_em desc);

alter table public.conquistas enable row level security;

-- Le so as suas. Nao ha policy de escrita NENHUMA: a unica porta e a funcao.
drop policy if exists conquistas_leitura on public.conquistas;
create policy conquistas_leitura on public.conquistas
  for select to authenticated using (usuario_id = auth.uid());

revoke all on public.conquistas from anon, authenticated;
grant select on public.conquistas to authenticated;

-- ── 2. O XP VALIDADO, no mesmo lugar ───────────────────────────────────────
-- Ordem dele: "podemos fazer isso no mesmo lugar, a gente economizaria bem".
-- O XP e um numero por pessoa, entao mora em `progresso`; quem o escreve e a
-- MESMA funcao que grava as conquistas. Um lugar, uma porta.
alter table public.progresso
  add column if not exists xp_validado integer not null default 0
  check (xp_validado >= 0);

comment on column public.progresso.xp_validado is
  'XP calculado pelo SERVIDOR a partir de sessoes_estudo. Escrito somente por '
  'sincronizar_conquistas(). O campo xp continua existindo e continua vindo do '
  'navegador -- os dois convivem de proposito ate a tela passar a usar este.';

-- ── 3. O AVALIADOR ─────────────────────────────────────────────────────────
-- Espelha `progressoDe()` de assets/js/condecoracoes.js. Devolve 0 a 1.
--
-- 🔴 Tipo desconhecido devolve 0 -- NAO concede. Um erro de digitacao no
-- catalogo tem de resultar em medalha que nao cai, nunca em medalha que cai
-- para todo mundo. Falhar para o lado seguro, igual ao lado do navegador.
create or replace function public.avaliar_condicao(cond jsonb, fatos jsonb)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  t text := cond->>'tipo';
  alvo numeric;
  atual numeric := 0;
  chave text;
  h int;
  d text;
begin
  if cond is null or fatos is null then return 0; end if;

  case t
    when 'sessoes'        then atual := coalesce((fatos->>'sessoes')::numeric, 0);        alvo := (cond->>'min')::numeric;
    when 'horas'          then atual := coalesce((fatos->>'horas')::numeric, 0);          alvo := (cond->>'min')::numeric;
    when 'xp'             then atual := coalesce((fatos->>'xp')::numeric, 0);             alvo := (cond->>'min')::numeric;
    when 'streak'         then atual := coalesce((fatos->>'streak')::numeric, 0);         alvo := (cond->>'min')::numeric;
    when 'sessaoUnica'    then atual := coalesce((fatos->>'maiorSessaoMin')::numeric, 0); alvo := (cond->>'minutosMin')::numeric;
    when 'sessoesNoDia'   then atual := coalesce((fatos->>'sessoesNoDiaMax')::numeric, 0);  alvo := (cond->>'quantas')::numeric;
    when 'horasNoDia'     then atual := coalesce((fatos->>'horasNoDiaMax')::numeric, 0);    alvo := (cond->>'min')::numeric;
    when 'materiasNoDia'  then atual := coalesce((fatos->>'materiasNoDiaMax')::numeric, 0); alvo := (cond->>'quantas')::numeric;
    when 'diasEstudados'  then atual := coalesce((fatos->>'diasEstudados')::numeric, 0);  alvo := (cond->>'min')::numeric;
    when 'meses'          then atual := coalesce((fatos->>'meses')::numeric, 0);          alvo := (cond->>'min')::numeric;
    when 'semanaPerfeita' then atual := coalesce((fatos->>'semanasPerfeitas')::numeric, 0); alvo := (cond->>'vezes')::numeric;
    when 'materiaSeguida' then atual := coalesce((fatos->>'materiaSeguidaMax')::numeric, 0); alvo := (cond->>'dias')::numeric;
    when 'retorno'        then atual := coalesce((fatos->>'maiorRetornoDias')::numeric, 0); alvo := (cond->>'diasSumidoMin')::numeric;
    when 'dominioMinimo'  then atual := coalesce((fatos->>'dominioMinimo')::numeric, 0);  alvo := (cond->>'min')::numeric;
    when 'materiaMenosEstudada' then
      atual := coalesce((fatos->>'dominioMenosEstudada')::numeric, 0); alvo := (cond->>'dominioMin')::numeric;

    when 'edital' then
      return case when coalesce((fatos->>'temEdital')::boolean, false) then 1 else 0 end;

    when 'atributo' then
      chave := cond->>'chave';
      atual := coalesce((fatos->'atributos'->chave->>'valor')::numeric, 0);
      alvo  := (cond->>'min')::numeric;

    when 'atributosTodos' then
      -- O progresso e o do PIOR, senao a barra mentiria dizendo "quase la"
      -- com um atributo zerado.
      alvo := (cond->>'min')::numeric;
      select coalesce(min(coalesce((fatos->'atributos'->(k#>>'{}')->>'valor')::numeric, 0)), 0)
      into atual
      from jsonb_array_elements(cond->'chaves') k;

    when 'materias' then
      alvo := (cond->>'quantas')::numeric;
      select count(*) into atual
      from jsonb_array_elements(coalesce(fatos->'materias', '[]'::jsonb)) m
      where coalesce((m->>'progresso')::numeric, 0) >= (cond->>'dominioMin')::numeric;

    when 'materiaDominada' then
      -- Nome de materia vem do edital e varia: compara sem acento e sem caixa.
      return case when exists (
        select 1
        from jsonb_array_elements(coalesce(fatos->'materias', '[]'::jsonb)) m
        join jsonb_array_elements_text(cond->'materias') alvo_nome
          on lower(unaccent_simples(alvo_nome)) = lower(unaccent_simples(m->>'nome'))
        where coalesce((m->>'progresso')::numeric, 0) >= (cond->>'dominioMin')::numeric
      ) then 1 else 0 end;

    when 'horario' then
      alvo := (cond->>'vezes')::numeric;
      atual := 0;
      for h in (cond->>'deHora')::int .. (cond->>'ateHora')::int - 1 loop
        atual := atual + coalesce((fatos->'porHora'->>h::text)::numeric, 0);
      end loop;

    when 'diaSemana' then
      alvo := (cond->>'vezes')::numeric;
      atual := 0;
      for d in select jsonb_array_elements_text(cond->'dias') loop
        atual := atual + coalesce((fatos->'porDiaSemana'->>d)::numeric, 0);
      end loop;

    when 'modo' then
      atual := coalesce((fatos->'porModo'->>(cond->>'modo'))::numeric, 0);
      alvo  := (cond->>'vezes')::numeric;

    -- 'condecoracao' e 'todas' dependem do que ja caiu; resolvidos na funcao
    -- de sincronia, em duas passadas, e nao aqui.
    else
      return 0;
  end case;

  if alvo is null or alvo <= 0 then return 0; end if;
  return least(1, atual / alvo);
end;
$$;

-- Tira acento sem depender da extensao `unaccent`, que nao esta instalada e
-- cuja instalacao exigiria privilegio que nao vale pedir por cinco letras.
create or replace function public.unaccent_simples(t text)
returns text language sql immutable set search_path = public as $$
  select translate(
    coalesce(t, ''),
    'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

-- ── 4. A SINCRONIA — a unica porta de escrita ──────────────────────────────
create or replace function public.sincronizar_conquistas()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_fatos jsonb;
  v_xp    integer := 0;
  v_novas text[] := '{}';
  v_ja    text[];
  r       record;
  total   int;
  tem     int;
begin
  -- 🔴 O id vem de auth.uid(), NUNCA de parametro. Aceitar um id de fora daria
  -- a qualquer um o poder de gravar conquista na conta alheia -- e esta funcao
  -- roda como dono do banco, entao a RLS nao a protegeria disso.
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  v_fatos := public.fatos_do_usuario();

  -- XP validado: a soma do que as sessoes registraram. E o numero honesto,
  -- porque sai de linha gravada, nao de campo informado pelo navegador.
  v_xp := coalesce((v_fatos->>'xpSessoes')::integer, 0);
  update public.progresso set xp_validado = v_xp where usuario_id = v_uid;

  select coalesce(array_agg(item_id), '{}') into v_ja
  from public.conquistas where usuario_id = v_uid and tipo = 'condecoracao';

  -- ── Primeira passada: as que nao dependem de outras ──────────────────────
  for r in
    select id, condicao from public.catalogo_condecoracoes
    where condicao->>'tipo' not in ('condecoracao', 'todas')
  loop
    if public.avaliar_condicao(r.condicao, v_fatos) >= 1 then
      insert into public.conquistas (usuario_id, tipo, item_id)
      values (v_uid, 'condecoracao', r.id)
      on conflict do nothing;
      if found then v_novas := v_novas || r.id; end if;
    end if;
  end loop;

  -- ── Segunda passada: as dependentes, ja sabendo o que caiu ───────────────
  select coalesce(array_agg(item_id), '{}') into v_ja
  from public.conquistas where usuario_id = v_uid and tipo = 'condecoracao';

  select count(*) into total from public.catalogo_condecoracoes
  where condicao->>'tipo' <> 'todas';
  select count(*) into tem from public.conquistas
  where usuario_id = v_uid and tipo = 'condecoracao'
    and item_id in (select id from public.catalogo_condecoracoes where condicao->>'tipo' <> 'todas');

  if total > 0 and tem >= total then
    for r in select id from public.catalogo_condecoracoes where condicao->>'tipo' = 'todas' loop
      insert into public.conquistas (usuario_id, tipo, item_id)
      values (v_uid, 'condecoracao', r.id) on conflict do nothing;
      if found then v_novas := v_novas || r.id; end if;
    end loop;
  end if;

  -- ── As divisas ───────────────────────────────────────────────────────────
  for r in select id, condicao from public.catalogo_divisas loop
    if (r.condicao->>'tipo' = 'condecoracao'
        and (r.condicao->>'id') = any(
          select item_id from public.conquistas
          where usuario_id = v_uid and tipo = 'condecoracao'))
       or (r.condicao->>'tipo' <> 'condecoracao'
           and public.avaliar_condicao(r.condicao, v_fatos) >= 1)
    then
      insert into public.conquistas (usuario_id, tipo, item_id)
      values (v_uid, 'divisa', r.id) on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'xpValidado', v_xp,
    'novas', to_jsonb(v_novas),
    'condecoracoes', (select coalesce(array_agg(item_id), '{}')
                      from public.conquistas where usuario_id = v_uid and tipo = 'condecoracao'),
    'divisas', (select coalesce(array_agg(item_id), '{}')
                from public.conquistas where usuario_id = v_uid and tipo = 'divisa')
  );
end;
$$;

comment on function public.sincronizar_conquistas() is
  'A UNICA porta de escrita das conquistas. security definer, mas grava so o '
  'que ela mesma calcula, para auth.uid(). Nunca apaga: conquista nao se '
  'desconquista. Ver historico/decisoes.md, 20/09/2026.';

revoke all on function public.sincronizar_conquistas() from public, anon;
grant execute on function public.sincronizar_conquistas() to authenticated;

revoke all on function public.avaliar_condicao(jsonb, jsonb) from public, anon;
grant execute on function public.avaliar_condicao(jsonb, jsonb) to authenticated;

revoke all on function public.unaccent_simples(text) from public, anon;
grant execute on function public.unaccent_simples(text) to authenticated;
