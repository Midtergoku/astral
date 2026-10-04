-- ============================================================================
-- Idade minima de 16 anos, com data de nascimento (03/10/2026)
-- Auditoria LGL-02 -- roadmap 3.6. Decisao dele (pergunta 1): "16, e perguntar a idade".
--
-- O QUE ESTAVA ERRADO: a Politica dizia "destinado a maiores de 18", os Termos
-- "16 anos ou mais", e nenhuma tela perguntava a idade. O publico do Astral tem
-- 17 anos (EsPCEx, EEAR). Menor de 18 e relativamente incapaz para CONTRATAR
-- sozinho -- importa no dia da primeira cobranca.
--
-- A REGRA (a mesma nos dois documentos, versao de 03/10/2026):
--   menos de 16  -> nao entra. A data NAO e gravada (dado de crianca nao fica).
--   16 e 17      -> entra e usa o gratis. `menor` = true: o pagamento (roadmap
--                   5.3) tem de exigir a confirmacao do responsavel.
--   18 ou mais   -> normal.
--
-- A data e gravada UMA VEZ, so pelo servidor (registrar_nascimento). Sem grant
-- de escrita na coluna: ninguem "envelhece" a conta depois para poder pagar.
-- Data errada se corrige pelo contato -- e fica o registro de que mudou.
-- ============================================================================

alter table public.perfis add column if not exists nascimento date;
-- (o grant de update do perfil continua so em `nome`: a coluna nova nao ganha escrita)

create or replace function public.idade_em_anos(p_data date)
returns integer language sql stable set search_path = public as $$
  select date_part('year', age((now() at time zone 'America/Sao_Paulo')::date, p_data))::integer;
$$;

create or replace function public.registrar_nascimento(p_data date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_atual date;
  v_idade integer;
begin
  if v_uid is null then
    raise exception 'precisa estar logado' using errcode = '42501';
  end if;
  select nascimento into v_atual from public.perfis where id = v_uid;
  if v_atual is not null then
    -- ja registrada: nao muda por aqui (so pelo contato, com registro)
    return jsonb_build_object('nascimento', true, 'menor', public.idade_em_anos(v_atual) < 18, 'mudou', false);
  end if;
  if p_data is null or p_data > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Data de nascimento invalida.' using errcode = '22023';
  end if;
  v_idade := public.idade_em_anos(p_data);
  if v_idade > 100 then
    raise exception 'Data de nascimento invalida.' using errcode = '22023';
  end if;
  if v_idade < 16 then
    -- NADA e gravado: o Astral nao guarda dado de menor de 16
    raise exception 'menor de 16' using errcode = '22023', hint = 'idade_minima';
  end if;
  update public.perfis set nascimento = p_data where id = v_uid;
  return jsonb_build_object('nascimento', true, 'menor', v_idade < 18, 'mudou', true);
end;
$$;
revoke all on function public.registrar_nascimento(date) from public, anon;
grant execute on function public.registrar_nascimento(date) to authenticated;

revoke all on function public.idade_em_anos(date) from public, anon;
grant execute on function public.idade_em_anos(date) to authenticated, service_role;

-- As versoes dos documentos mudam: os dois textos passam a dizer a MESMA regra.
create or replace function public.versoes_vigentes()
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'termos',   '2026-10-03',     -- termos.html, "Ultima atualizacao: 3 de outubro de 2026"
    'politica', '2026-10-03'      -- privacidade.html, "Ultima atualizacao: 3 de outubro de 2026"
  );
$$;

-- O portao (consentimento.js) passa a saber tambem se a data foi dada e se e menor.
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
         and c.versao_politica = public.versoes_vigentes()->>'politica'),
    'nascimento', exists (select 1 from public.perfis p where p.id = auth.uid() and p.nascimento is not null),
    'menor', coalesce((select public.idade_em_anos(p.nascimento) < 18 from public.perfis p where p.id = auth.uid()), false));
$$;
