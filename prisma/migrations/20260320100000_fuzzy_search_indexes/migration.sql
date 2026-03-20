-- Habilita extensões para fuzzy search em pt-BR
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Wrapper imutável para unaccent (necessário para índices funcionais)
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
  $func$ SELECT unaccent('unaccent', $1) $func$;

-- Índices GIN para busca rápida por similaridade (pg_trgm)
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm
  ON clientes USING GIN (f_unaccent(lower(nome)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm
  ON produtos USING GIN (f_unaccent(lower(nome)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_trgm
  ON fornecedores USING GIN (f_unaccent(lower(nome)) gin_trgm_ops);
