-- ============================================================================
-- Sessao de menos de 1 minuto nao entra (03/10/2026)
-- Auditoria GAM-10 -- roadmap 3.1 (junto com o cronometro pelo relogio,
-- CRN-01 e GAM-11, que sao do navegador).
-- Gerada da definicao em producao (ja com o 2.5), sem copia a mao.
-- Vale so para gravacao pelo site (gravacao_pelo_site): a chave de servico
-- (testes, semeadura) continua livre.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validar_sessao_estudo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_desde    timestamptz;
  v_hoje     date := (now() at time zone 'America/Sao_Paulo')::date;
  v_declarado integer;
begin
  if not public.gravacao_pelo_site() then
    return new;
  end if;

  new.criado_em := now();
  new.segundos  := greatest(0, coalesce(new.segundos, 0));

  -- 03/10/2026 (auditoria GAM-10, roadmap 3.1): uma sessao de 20 s era aceita
  -- e contava como DIA estudado (sequencia, Disciplina) e como sessao
  -- (condecoracoes de "N sessoes"): 1 minuto por dia sustentava a sequencia.
  -- A tela ja nao manda menos de 1 min; agora o servidor tambem nao aceita.
  if new.segundos < 60 then
    raise exception 'sessao com menos de 1 minuto' using errcode = '22023';
  end if;

  -- 03/10/2026 (NUM-01): materia que NAO esta no edital da pessoa vira
  -- "Geral". Antes o servidor aceitava "Ingles" num edital de Bombeiros
  -- (HTTP 201) e a materia inventada contava nos atributos. Nao RECUSA: quem
  -- trocou de edital com o cronometro aberto perderia o tempo que estudou de
  -- verdade. O tempo e o XP ficam; a materia que nao existe nao.
  if new.materia is not null and lower(new.materia) <> 'geral' and not exists (
       select 1 from public.progresso p, jsonb_array_elements(p.materias) m
        where p.usuario_id = new.usuario_id and lower(m->>'nome') = lower(new.materia)) then
    new.materia := 'Geral';
  end if;

  if new.modo = 'cronograma' then
    if new.segundos > 4 * 3600 then
      raise exception 'sessao do cronograma acima de 4 horas' using errcode = '22023';
    end if;
    select coalesce(sum(segundos), 0) into v_declarado
      from public.sessoes_estudo
     where usuario_id = new.usuario_id and modo = 'cronograma'
       and (criado_em at time zone 'America/Sao_Paulo')::date = v_hoje;
    if v_declarado + new.segundos > 12 * 3600 then
      raise exception 'limite de 12 horas declaradas por dia' using errcode = '22023';
    end if;
    new.xp := case when new.segundos >= 60
                   then greatest(10, round(new.segundos / 120.0))::integer else 0 end;
  else
    -- Medida: o relogio tem de ter tido tempo de correr.
    select greatest(
             (select max(criado_em) from public.sessoes_estudo
               where usuario_id = new.usuario_id and modo in ('livre', 'pomodoro')),
             (select created_at from auth.users where id = new.usuario_id))
      into v_desde;
    if v_desde is not null
       and new.segundos > extract(epoch from (now() - v_desde)) + 120 then
      raise exception 'sessao mais longa que o tempo que passou' using errcode = '22023';
    end if;
    new.xp := (floor(new.segundos / 60.0) * 2)::integer;
  end if;

  return new;
end;
$function$;
