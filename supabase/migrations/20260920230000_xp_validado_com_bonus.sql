-- ═══════════════════════════════════════════════════════════════════════════
-- O XP VALIDADO PASSA A INCLUIR O BONUS DAS HABILIDADES
--
-- Ate agora `sincronizar_conquistas` gravava `xp_validado` como a soma crua
-- das sessoes. Com a arvore de habilidades (R2), o XP que a pessoa ve tem de
-- incluir o que as escolhas dela renderam -- senao gastar um ponto nao muda
-- nada na tela, e a arvore vira enfeite.
--
-- ⚠️ O QUE **NAO** MUDA: os PONTOS continuam vindo do XP BASE, sem bonus.
-- E o corte da circularidade (ver a migration da arvore): habilidade nao
-- compra habilidade.

create or replace function public.sincronizar_conquistas()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_fatos jsonb;
  v_xp    jsonb;
  v_novas text[] := '{}';
  r       record;
  total   int;
  tem     int;
begin
  if v_uid is null then
    raise exception 'Sem sessao: faca login.' using errcode = '28000';
  end if;

  v_fatos := public.fatos_do_usuario();
  v_xp    := public.xp_com_bonus(v_uid);

  update public.progresso
     set xp_validado = (v_xp->>'comBonus')::integer
   where usuario_id = v_uid;

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
    'xpValidado', (v_xp->>'comBonus')::integer,
    'xpBase',     (v_xp->>'base')::integer,
    -- Os pontos saem do XP BASE. Vao juntos na resposta para a tela nao
    -- precisar de outra ida ao servidor so para saber quantos sobraram.
    'pontos',     (v_xp->>'pontos')::integer,
    'gastos',     (select count(*) from public.habilidades_escolhidas where usuario_id = v_uid),
    'habilidades', (select coalesce(array_agg(habilidade_id), '{}')
                    from public.habilidades_escolhidas where usuario_id = v_uid),
    'novas', to_jsonb(v_novas),
    'condecoracoes', (select coalesce(array_agg(item_id), '{}')
                      from public.conquistas where usuario_id = v_uid and tipo = 'condecoracao'),
    'divisas', (select coalesce(array_agg(item_id), '{}')
                from public.conquistas where usuario_id = v_uid and tipo = 'divisa')
  );
end;
$$;
