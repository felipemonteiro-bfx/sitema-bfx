-- Restaura o indice de forma_pagamento em vendas.
--
-- Ele foi criado no backfill 20260410000000_add_forma_pagamento e removido sem
-- querer em 20260720201100_reconcile_schema_drift. A fila da Central Prudent
-- (/prudent) filtra por forma_pagamento a cada carga da tela, entao sem o indice
-- a consulta faz seq scan na tabela de vendas.

CREATE INDEX IF NOT EXISTS "vendas_forma_pagamento_idx" ON "vendas"("forma_pagamento");
