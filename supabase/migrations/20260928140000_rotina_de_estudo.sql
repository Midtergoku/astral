-- ============================================================================
-- A ROTINA DE ESTUDO -- base do cronograma individual
--
-- Pedido dele em 28/09/2026: "em nenhum momento foi perguntado da minha
-- rotina, como vamos montar um cronograma individual para a pessoa se esse
-- questionario nao foi feito, quero algo simples e objetivo e so e feito
-- quando uma pessoa entra pela primeira vez, mas e possivel alterar depois o
-- cronograma manualmente."
--
-- Guarda o que a pessoa respondeu (dias, tempo por dia, tamanho da sessao) e,
-- se ela editar a semana a mao, a semana editada. Quem monta o cronograma e
-- assets/js/cronograma.js, no navegador -- conta simples, sem IA, sem custo.
--
-- NULO = nunca respondeu. E isso que faz o questionario aparecer UMA vez.
--
-- 🔴 PERMISSAO POR COLUNA, de proposito (licao de 20/09, migration
-- 20260920200000): `progresso` tem grant coluna a coluna. Coluna nova nasce
-- sem permissao nenhuma -- entao ou se da o grant dela aqui, ou o navegador
-- nao consegue gravar. E so ela: nada mais muda.
-- ============================================================================

alter table public.progresso
  add column if not exists rotina jsonb;

-- Validacao no servidor (a da tela e conveniencia): objeto, e pequeno.
-- 8 KB cabem a semana inteira editada com folga; mais que isso e lixo.
alter table public.progresso
  drop constraint if exists progresso_rotina_valida;
alter table public.progresso
  add constraint progresso_rotina_valida check (
    rotina is null
    or (jsonb_typeof(rotina) = 'object' and pg_column_size(rotina) <= 8192)
  );

grant update (rotina) on public.progresso to authenticated;
grant insert (rotina) on public.progresso to authenticated;

comment on column public.progresso.rotina is
  'O que a pessoa respondeu no questionario de rotina (dias, minutos, bloco) '
  'e, se editou a semana a mao, a semana editada. Nulo = nunca respondeu. '
  'Lida por assets/js/cronograma.js.';
