-- ============================================================================
-- Conserta a criacao automatica de perfil e faz o backfill dos orfaos.
--
-- Defeito: a funcao era SECURITY DEFINER SEM "set search_path". Disparada a
-- partir de auth.users, o search_path nao incluia public e o INSERT nao
-- encontrava a tabela perfis. O bloco "exception when others then return new"
-- engolia o erro em silencio, o usuario era criado normalmente e nenhum perfil
-- nascia. Estado encontrado em 30/07/2026: 6 usuarios em auth.users, 0 linhas
-- em perfis -- desde o primeiro cadastro, em 23/06.
--
-- Consequencias que isso ja causava: o badge de plano sempre caia no fallback
-- 'free', e promover alguem para 'beta' pela Table Editor era impossivel,
-- porque nao existia linha para editar.
-- ============================================================================

create or replace function public.criar_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email, tipo_plano)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Concurseiro'
    ),
    new.email,
    'free'
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Criar conta nao pode falhar por causa do perfil: o usuario nao tem culpa
    -- e ficaria sem conseguir entrar. Mas o erro PRECISA aparecer. A versao
    -- anterior retornava em silencio, e foi so por isso que o defeito
    -- sobreviveu a seis cadastros sem ninguem perceber.
    raise warning 'criar_perfil_usuario falhou para usuario %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Backfill: cria o perfil de quem se cadastrou enquanto a trigger estava quebrada.
-- Idempotente -- rodar de novo nao duplica nada.
insert into public.perfis (id, nome, email, tipo_plano)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Concurseiro'
  ),
  u.email,
  'free'
from auth.users u
left join public.perfis p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
