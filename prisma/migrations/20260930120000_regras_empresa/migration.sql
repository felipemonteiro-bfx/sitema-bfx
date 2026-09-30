-- Regras por empresa e parcela única — 2026-09-30.
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.1 e §3.2.
-- A unique (venda_id, numero_parcela) abortaria com erro genérico se houvesse duplicata e o pod
-- ficaria em CrashLoop (P3009). O bloco abaixo aborta antes, dizendo quais vendas reparar.
DO $$
DECLARE dups text;
BEGIN
  SELECT string_agg(venda_id || '/' || numero_parcela, ', ') INTO dups
  FROM (SELECT venda_id, numero_parcela FROM parcelas_vencimento
        GROUP BY venda_id, numero_parcela HAVING count(*) > 1) d;
  IF dups IS NOT NULL THEN
    RAISE EXCEPTION 'parcelas_vencimento com numero repetido (venda/parcela): %', dups;
  END IF;
END $$;

-- Sem regra cadastrada a empresa segue o comportamento anterior (corte 20, vencimento dia 10).
CREATE TABLE "regras_empresa" (
    "id" SERIAL NOT NULL,
    "empresa_parceira_id" INTEGER NOT NULL,
    "vigente_de" TIMESTAMP(3) NOT NULL,
    "vigente_ate" TIMESTAMP(3),
    "dia_corte" INTEGER NOT NULL DEFAULT 20,
    "dia_vencimento" INTEGER NOT NULL DEFAULT 10,
    "dia_pix" INTEGER NOT NULL DEFAULT 15,
    "repasse_pct" DOUBLE PRECISION,
    "repasse_base" TEXT,
    "cobranca_via_bfx" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criada_por" TEXT,

    CONSTRAINT "regras_empresa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "regras_empresa_empresa_parceira_id_vigente_de_idx" ON "regras_empresa"("empresa_parceira_id", "vigente_de");

ALTER TABLE "regras_empresa" ADD CONSTRAINT "regras_empresa_empresa_parceira_id_fkey" FOREIGN KEY ("empresa_parceira_id") REFERENCES "empresas_parceiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "parcelas_vencimento_venda_id_numero_parcela_key" ON "parcelas_vencimento"("venda_id", "numero_parcela");
