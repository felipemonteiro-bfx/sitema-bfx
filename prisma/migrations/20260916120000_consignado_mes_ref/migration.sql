-- Mês (YYYY-MM) em que pct_consignado/faixa_consignado foram calculados. Nulo =
-- nunca calculado; o app recalcula em lote quem está nulo ou em outro mês.
ALTER TABLE "clientes" ADD COLUMN "consignado_mes_ref" TEXT;
