-- Transcrição (feita no navegador) e onda sonora (40 picos) do áudio. Todas as colunas são opcionais.
ALTER TABLE "whatsapp_midias"
  ADD COLUMN "transcricao" TEXT,
  ADD COLUMN "transcricao_em" TIMESTAMP(3),
  ADD COLUMN "transcricao_autor_id" INTEGER,
  ADD COLUMN "transcricao_modelo" TEXT,
  ADD COLUMN "onda" BYTEA;
