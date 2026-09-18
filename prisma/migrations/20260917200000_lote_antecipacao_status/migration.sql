-- Lote de antecipação com ciclo de vida — 2026-09-17.
-- Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
--
-- Antes, "antecipar" marcava tudo de uma vez: parcela antecipada e paga pela Prudent no mesmo
-- clique que gerava o arquivo. Agora o envio abre um lote `em_andamento` e só a confirmação do
-- retorno marca as parcelas. A parcela aponta para o lote enquanto ele está aberto.
ALTER TABLE "antecipacao_batches" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'em_andamento';
ALTER TABLE "antecipacao_batches" ADD COLUMN IF NOT EXISTS "origem" TEXT NOT NULL DEFAULT 'envio';
ALTER TABLE "antecipacao_batches" ADD COLUMN IF NOT EXISTS "concluida_em" TIMESTAMP(3);
ALTER TABLE "antecipacao_batches" ADD COLUMN IF NOT EXISTS "concluida_por" TEXT;
ALTER TABLE "antecipacao_batches" ADD COLUMN IF NOT EXISTS "observacao" TEXT;

ALTER TABLE "parcelas_vencimento" ADD COLUMN IF NOT EXISTS "antecipacao_lote_id" INTEGER;
CREATE INDEX IF NOT EXISTS "parcelas_vencimento_antecipacao_lote_id_idx" ON "parcelas_vencimento"("antecipacao_lote_id");
ALTER TABLE "parcelas_vencimento" DROP CONSTRAINT IF EXISTS "parcelas_vencimento_antecipacao_lote_id_fkey";
ALTER TABLE "parcelas_vencimento"
  ADD CONSTRAINT "parcelas_vencimento_antecipacao_lote_id_fkey"
  FOREIGN KEY ("antecipacao_lote_id") REFERENCES "antecipacao_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lote criado antes desta migração nasceu com o comportamento antigo: as parcelas dele já foram
-- marcadas como antecipadas no mesmo clique, então ele é um lote concluído. A data da conclusão
-- é a da criação — inventar outra seria pior do que repetir a que existe. Só toca lote que ainda
-- não tem conclusão registrada, então rodar de novo não muda nada.
UPDATE "antecipacao_batches"
   SET "status" = 'concluido',
       "concluida_em" = "criada_em",
       "concluida_por" = 'Sistema (migração)'
 WHERE "concluida_em" IS NULL
   -- Só lote anterior a esta migração: reaplicar o arquivo à mão não pode fechar um lote que o
   -- André abriu depois e ainda espera retorno da Prudent.
   AND "criada_em" < TIMESTAMP '2026-09-17 20:00:00';
