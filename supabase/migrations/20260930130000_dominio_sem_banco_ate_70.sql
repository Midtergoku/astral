-- ============================================================================
-- MATERIA SEM BANCO: O ESTUDO LEVA ATE 70, NAO ATE 100
--
-- Medido logo depois da migration 20260930120000, na conta simulada do dono:
-- "Legislacao" (o Banco tem 2 questoes, abaixo do minimo de 10) chegou a 90%
-- so com 13,5 h de estudo -- enquanto Portugues, com Banco, fica em 40% sem
-- acertar questao. Era premiar justamente a materia que nao tem como ser
-- conferida. Ele pediu o contrario: "depender cada vez mais do banco".
--
-- Agora: materia sem Banco = 70 x minutos / 900 (15 h para o teto de 70).
-- 70 e a linha da tag -- alcancavel, mas so no fim, e nunca acima de quem
-- prova o dominio respondendo questao.
-- ============================================================================

create or replace function public.dominio_formula(
  p_acervo integer, p_respondidas integer, p_primeira integer, p_minutos numeric)
returns integer language sql immutable as $$
  select case
    when coalesce(p_acervo, 0) >= 10 then round(100 * (
           0.6 * case when coalesce(p_respondidas, 0) > 0
                      then (p_primeira::numeric / p_respondidas)
                           * least(1.0, p_respondidas::numeric / least(30, greatest(p_acervo, 1)))
                      else 0 end
         + 0.4 * least(1.0, coalesce(p_minutos, 0) / 600.0)))::integer
    else round(70 * least(1.0, coalesce(p_minutos, 0) / 900.0))::integer
  end;
$$;
