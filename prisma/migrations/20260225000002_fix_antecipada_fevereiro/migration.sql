-- Corrige vendas de fevereiro/2026 que foram criadas com antecipada=1 (antes do fix)
-- mas não foram efetivamente antecipadas pela Central Prudent
UPDATE vendas
SET antecipada = 0
WHERE data_venda >= '2026-02-01'
  AND data_venda < '2026-03-01'
  AND (antecipada = 1 OR antecipada IS NULL);
