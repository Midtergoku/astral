-- ============================================================================
-- O TAF -- TESTE DE APTIDAO FISICA, COM XP PROPRIO
--
-- Pedido dele em 30/09/2026 (item 10): "um modulo de TAF: registrar corrida,
-- barra e flexao com XP proprio; adaptar ao edital e a masculino/feminino;
-- tratar concurso sem TAF". Aprovado no mesmo dia.
--
-- ── TRES DECISOES ───────────────────────────────────────────────────────────
-- 1. XP PROPRIO, SEPARADO DO XP DE ESTUDO. A patente mede estudo; misturar
--    flexao nela faria a patente de estudo subir por treino fisico. O TAF tem
--    o seu "preparo fisico", calculado aqui, que nao toca `progresso.xp`.
-- 2. O XP E DO SERVIDOR e conta UMA vez por prova por dia (10 XP). Registrar
--    20 marcas de barra no mesmo dia vale o mesmo que uma: o que se premia e
--    TREINAR em dias diferentes, nao apertar o botao.
-- 3. O INDICE (a meta) e do edital quando o edital diz; senao a pessoa digita.
--    Nunca inventado. A configuracao (sexo, metas, "meu concurso nao tem TAF")
--    mora em `progresso.taf`, como a rotina mora em `progresso.rotina`.
--
-- Valores com limite de sanidade por prova: 50 km numa corrida de 12 minutos
-- nao e marca, e erro de digitacao -- e erro de digitacao nao vira grafico.
-- ============================================================================

create table if not exists public.taf_registros (
  id         bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prova      text not null check (prova in
               ('corrida_12min', 'barra', 'flexao', 'abdominal', 'corrida_50m', 'natacao_50m')),
  valor      numeric not null check (valor > 0),
  criado_em  timestamptz not null default now()
);
create index if not exists taf_registros_usuario on public.taf_registros (usuario_id, criado_em desc);

alter table public.taf_registros enable row level security;
revoke all on public.taf_registros from anon, authenticated;
-- So prova e valor: o dono vem do default (auth.uid()) e a data, do relogio do servidor.
grant select, delete on public.taf_registros to authenticated;
grant insert (prova, valor) on public.taf_registros to authenticated;

drop policy if exists taf_le_o_seu on public.taf_registros;
create policy taf_le_o_seu on public.taf_registros for select to authenticated
  using (usuario_id = auth.uid());
drop policy if exists taf_grava_o_seu on public.taf_registros;
create policy taf_grava_o_seu on public.taf_registros for insert to authenticated
  with check (usuario_id = auth.uid());
drop policy if exists taf_apaga_o_seu on public.taf_registros;
create policy taf_apaga_o_seu on public.taf_registros for delete to authenticated
  using (usuario_id = auth.uid());

-- Sanidade e teto diario, no servidor (a tela tambem confere -- regra 3).
create or replace function public.validar_taf()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_min numeric; v_max numeric; v_hoje integer;
begin
  new.criado_em := now();
  select lo, hi into v_min, v_max from (values
    ('corrida_12min', 200::numeric, 5000::numeric),   -- metros
    ('barra',           1, 60),                       -- repeticoes
    ('flexao',          1, 150),
    ('abdominal',       1, 150),
    ('corrida_50m',     4, 30),                       -- segundos
    ('natacao_50m',    15, 300)                       -- segundos
  ) t(p, lo, hi) where p = new.prova;
  if new.valor < v_min or new.valor > v_max then
    raise exception 'marca fora do possivel para esta prova (% a %)', v_min, v_max using errcode = '22023';
  end if;
  select count(*) into v_hoje from public.taf_registros
   where usuario_id = new.usuario_id
     and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if v_hoje >= 30 then
    raise exception 'limite de 30 marcas por dia' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists taf_confiavel on public.taf_registros;
create trigger taf_confiavel before insert on public.taf_registros
  for each row execute function public.validar_taf();
revoke all on function public.validar_taf() from public, anon, authenticated;

-- A configuracao: { sexo: 'm'|'f', semTaf: bool, metas: { prova: valor } }
alter table public.progresso add column if not exists taf jsonb;
alter table public.progresso drop constraint if exists progresso_taf_valido;
alter table public.progresso add constraint progresso_taf_valido check (
  taf is null or (jsonb_typeof(taf) = 'object' and pg_column_size(taf) <= 4096));
grant update (taf) on public.progresso to authenticated;
grant insert (taf) on public.progresso to authenticated;

-- ── O resumo: melhor marca, ultimas marcas e o XP de preparo fisico ──────────
-- Provas de TEMPO (corrida_50m, natacao_50m): menor e melhor.
create or replace function public.meu_taf()
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (
    select prova, valor, criado_em,
           (criado_em at time zone 'America/Sao_Paulo')::date as dia,
           prova in ('corrida_50m', 'natacao_50m') as tempo
      from public.taf_registros where usuario_id = auth.uid()
  ),
  por_prova as (
    select prova,
           case when bool_and(tempo) then min(valor) else max(valor) end as melhor,
           count(*) as registros,
           (array_agg(valor order by criado_em desc))[1] as ultima,
           max(criado_em) as ultima_em,
           (select jsonb_agg(jsonb_build_object('valor', x.valor, 'dia', x.dia) order by x.criado_em)
              from (select * from r r2 where r2.prova = r.prova order by criado_em desc limit 10) x) as serie
      from r group by prova
  )
  select jsonb_build_object(
    'xp', (select count(*) * 10 from (select distinct dia, prova from r) d),
    'dias_treinados', (select count(distinct dia) from r),
    'provas', coalesce((select jsonb_object_agg(prova, jsonb_build_object(
        'melhor', melhor, 'ultima', ultima, 'registros', registros,
        'ultima_em', ultima_em, 'serie', serie)) from por_prova), '{}'::jsonb));
$$;
revoke all on function public.meu_taf() from public, anon;
grant execute on function public.meu_taf() to authenticated;

comment on table public.taf_registros is
  'Marcas do TAF. Dono pelo default auth.uid(), data pelo servidor, valor conferido por prova '
  '(validar_taf). XP de preparo fisico em meu_taf(): 10 por prova por dia, separado do XP de estudo.';
