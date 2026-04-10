-- Add forma_pagamento canonical field to vendas table.
-- The legacy boolean flags (desconto_em_folha, boleto) are kept and synced
-- via application code to preserve backwards compatibility with older
-- integrations and reports.
--
-- Allowed values:
--   DESCONTO_FOLHA | BOLETO | PIX | DINHEIRO | CARTAO_CREDITO | CARTAO_DEBITO | TRANSFERENCIA | OUTRO

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- Backfill: derive a value for every existing row.
-- Priority: desconto em folha > boleto > parcelado (likely cartao) > avista (PIX/DINHEIRO bucket).
UPDATE vendas
SET forma_pagamento = 'DESCONTO_FOLHA'
WHERE forma_pagamento IS NULL
  AND desconto_em_folha = TRUE;

UPDATE vendas
SET forma_pagamento = 'BOLETO'
WHERE forma_pagamento IS NULL
  AND boleto = TRUE;

UPDATE vendas
SET forma_pagamento = 'CARTAO_CREDITO'
WHERE forma_pagamento IS NULL
  AND COALESCE(parcelas, 1) > 1;

-- Tudo o que sobrou é venda a vista historica (dinheiro ou pix nao distinguiveis).
UPDATE vendas
SET forma_pagamento = 'OUTRO'
WHERE forma_pagamento IS NULL;

-- Index para o filtro de historico.
CREATE INDEX IF NOT EXISTS vendas_forma_pagamento_idx ON vendas(forma_pagamento);
