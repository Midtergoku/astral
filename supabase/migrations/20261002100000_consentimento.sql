-- ============================================================================
-- O ACEITE DOS TERMOS E DA POLITICA, GRAVADO -- quem, quando, qual versao
--
-- Auditoria pre-lancamento, achado LGL-01 (S0), Lote 1 do roadmap (02/10/2026).
--
-- ── O QUE ESTAVA ERRADO ─────────────────────────────────────────────────────
-- A caixa "Li e aceito" so era conferida no cadastro por e-mail, e so no
-- navegador. "Cadastrar com Google" nao olhava a caixa, e entrar com Google
-- pela tela de login tambem cria conta. Em nenhum caminho ficava gravado o
-- aceite. Pela LGPD (art. 8, par. 2) cabe ao controlador PROVAR o consentimento.
--
-- ── O QUE PASSA A HAVER ─────────────────────────────────────────────────────
--   versoes_vigentes()        a UNICA fonte das versoes em vigor. A versao e a
--                             data "Ultima atualizacao" do topo de cada documento.
--                             Mudou o texto? Muda a data la E aqui -- o
--                             tools/testa-consentimento.js falha se divergirem.
--   consentimentos            uma linha por aceite (usuario, versoes, quando,
--                             por onde). So o proprio le; ninguem grava direto.
--   registrar_consentimento() a unica porta de escrita: so aceita as versoes
--                             VIGENTES (aceite de texto velho nao vale).
--   meu_consentimento()       "a pessoa aceitou as versoes de hoje?"
--
-- Quem ainda nao aceitou a versao vigente -- inclusive as contas criadas
-- antes de 02/10 -- ve a tela de aceite antes de usar o app (assets/js/
-- consentimento.js, chamado pelo exigirSessao de astral.js).
-- ============================================================================

create or replace function public.versoes_vigentes()
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'termos',   '2026-07-30',     -- termos.html, "Ultima atualizacao: 30 de julho de 2026"
    'politica', '2026-06-20'      -- privacidade.html, "Ultima atualizacao: 20 de junho de 2026"
  );
$$;

create table if not exists public.consentimentos (
  id               bigint generated always as identity primary key,
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  versao_termos    text not null,
  versao_politica  text not null,
  origem           text not null check (origem in ('cadastro_email', 'google', 'tela_de_aceite')),
  aceito_em        timestamptz not null default now(),
  unique (usuario_id, versao_termos, versao_politica)
);

alter table public.consentimentos enable row level security;

drop policy if exists "cada um le o seu aceite" on public.consentimentos;
create policy "cada um le o seu aceite" on public.consentimentos
  for select to authenticated using (usuario_id = (select auth.uid()));

-- Sem grant de escrita: a unica porta e registrar_consentimento().
revoke all on public.consentimentos from anon, authenticated;
grant select on public.consentimentos to authenticated;

create or replace function public.registrar_consentimento(
  p_versao_termos text, p_versao_politica text, p_origem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_vig jsonb := public.versoes_vigentes();
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;
  if p_versao_termos is distinct from v_vig->>'termos'
     or p_versao_politica is distinct from v_vig->>'politica' then
    raise exception 'versao dos documentos desatualizada: recarregue a pagina' using errcode = '22023';
  end if;
  if p_origem not in ('cadastro_email', 'google', 'tela_de_aceite') then
    raise exception 'origem invalida' using errcode = '22023';
  end if;
  insert into public.consentimentos (usuario_id, versao_termos, versao_politica, origem)
  values (v_uid, p_versao_termos, p_versao_politica, p_origem)
  on conflict (usuario_id, versao_termos, versao_politica) do nothing;
  return public.meu_consentimento();
end;
$$;

create or replace function public.meu_consentimento()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'vigentes', public.versoes_vigentes(),
    'aceito', exists (
      select 1 from public.consentimentos c
       where c.usuario_id = auth.uid()
         and c.versao_termos = public.versoes_vigentes()->>'termos'
         and c.versao_politica = public.versoes_vigentes()->>'politica'),
    'aceito_em', (
      select max(c.aceito_em) from public.consentimentos c
       where c.usuario_id = auth.uid()
         and c.versao_termos = public.versoes_vigentes()->>'termos'
         and c.versao_politica = public.versoes_vigentes()->>'politica'));
$$;

revoke all on function public.versoes_vigentes() from public, anon;
revoke all on function public.registrar_consentimento(text, text, text) from public, anon;
revoke all on function public.meu_consentimento() from public, anon;
grant execute on function public.versoes_vigentes() to authenticated, service_role;
grant execute on function public.registrar_consentimento(text, text, text) to authenticated;
grant execute on function public.meu_consentimento() to authenticated;
