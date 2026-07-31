-- Quota por unidade consumida, nao por chamada.
--
-- Ate aqui `uso_ia` tinha uma linha por chamada e a quota contava linhas. Como
-- `gerar-questoes` aceita ate 20 questoes numa chamada so, o limite de "50 por
-- dia" do plano pro valia na pratica ate 1.000 questoes por dia -- cerca de
-- R$ 264/mes de API para um assinante de R$ 19,90.
--
-- Com `unidades`, uma chamada que gera 8 questoes gasta 8 do limite. O numero
-- do plano passa a significar o que aparenta significar.

alter table public.uso_ia
  add column if not exists unidades integer not null default 1;

alter table public.uso_ia
  add constraint uso_ia_unidades_positiva check (unidades between 1 and 100);

-- As linhas antigas ficam valendo 1 unidade (o default), que e exatamente o que
-- elas eram: uma chamada. Nao da para saber quantas questoes cada uma gerou.

comment on column public.uso_ia.unidades is
  'Quanto a chamada consumiu da quota do dia. gerar-questoes grava o numero de questoes; as demais funcoes gravam 1.';

-- O indice existente ja cobre (usuario_id, funcao, criado_em); a soma de
-- `unidades` roda sobre o mesmo recorte, entao nao precisa de indice novo.
