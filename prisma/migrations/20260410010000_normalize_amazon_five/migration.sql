-- Normaliza variantes de "AMAZON FIVE" em duas tabelas:
--   1. empresas_parceiras.nome  (UNIQUE — exige merge de IDs duplicados)
--   2. clientes.empresa         (texto livre — UPDATE direto)
--
-- Variantes cobertas (case-insensitive, espacos/typos ignorados via REPLACE+LOWER):
--   Amazon Five, AMAZON FIVE, amazon five, Amazonfive, AMAZONFIVE, AMAOZN FIVE, AMAOZNFIVE
--
-- Regras:
--   - LOWER(REPLACE(nome,' ','')) ∈ {'amazonfive','amaoznfive'} → bate
--   - Nome canonico final: 'AMAZON FIVE'

-- =============================================================
-- PHASE 1 — empresas_parceiras (merge de IDs duplicados)
-- =============================================================
DO $$
DECLARE
  target_id INT;
  duplicate_ids INT[];
BEGIN
  -- Escolhe o menor ID como "alvo" (vai sobreviver e ser renomeado).
  SELECT MIN(id) INTO target_id
  FROM empresas_parceiras
  WHERE LOWER(REPLACE(nome, ' ', '')) IN ('amazonfive', 'amaoznfive');

  IF target_id IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa parceira AMAZON FIVE encontrada — nada a fazer na fase 1.';
  ELSE
    -- IDs duplicados: todos exceto o alvo.
    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::INT[]) INTO duplicate_ids
    FROM empresas_parceiras
    WHERE LOWER(REPLACE(nome, ' ', '')) IN ('amazonfive', 'amaoznfive')
      AND id <> target_id;

    IF array_length(duplicate_ids, 1) > 0 THEN
      RAISE NOTICE 'Merge: target_id=%, duplicates=%', target_id, duplicate_ids;

      -- Reapontar clientes que apontam para os duplicados.
      UPDATE clientes
      SET empresa_parceira_id = target_id
      WHERE empresa_parceira_id = ANY(duplicate_ids);

      -- Reapontar empresas_vinculos (origem).
      -- Evita violar UNIQUE(empresa_id, vinculada_id): se ja existe a tupla com target_id, deleta a duplicada.
      DELETE FROM empresas_vinculos
      WHERE empresa_id = ANY(duplicate_ids)
        AND EXISTS (
          SELECT 1 FROM empresas_vinculos ev2
          WHERE ev2.empresa_id = target_id
            AND ev2.vinculada_id = empresas_vinculos.vinculada_id
        );
      UPDATE empresas_vinculos
      SET empresa_id = target_id
      WHERE empresa_id = ANY(duplicate_ids);

      -- Reapontar empresas_vinculos (destino).
      DELETE FROM empresas_vinculos
      WHERE vinculada_id = ANY(duplicate_ids)
        AND EXISTS (
          SELECT 1 FROM empresas_vinculos ev2
          WHERE ev2.vinculada_id = target_id
            AND ev2.empresa_id = empresas_vinculos.empresa_id
        );
      UPDATE empresas_vinculos
      SET vinculada_id = target_id
      WHERE vinculada_id = ANY(duplicate_ids);

      -- Remove auto-vinculo apos merge (empresa_id == vinculada_id).
      DELETE FROM empresas_vinculos WHERE empresa_id = vinculada_id;

      -- Agora pode deletar os registros duplicados de empresas_parceiras.
      DELETE FROM empresas_parceiras WHERE id = ANY(duplicate_ids);
    END IF;

    -- Renomeia o registro que sobrou para o nome canonico.
    UPDATE empresas_parceiras SET nome = 'AMAZON FIVE' WHERE id = target_id;
  END IF;
END $$;

-- =============================================================
-- PHASE 2 — clientes.empresa (campo texto livre)
-- =============================================================
UPDATE clientes
SET empresa = 'AMAZON FIVE'
WHERE empresa IS NOT NULL
  AND LOWER(REPLACE(empresa, ' ', '')) IN ('amazonfive', 'amaoznfive');
