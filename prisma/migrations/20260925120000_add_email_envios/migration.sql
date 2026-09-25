CREATE TABLE "email_envios" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'automatico',
    "empresa_id" INTEGER,
    "venda_id" INTEGER,
    "remetente" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "cc" TEXT,
    "assunto" TEXT NOT NULL,
    "corpo_html" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "erro" TEXT,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_envios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_envio_anexos" (
    "id" SERIAL NOT NULL,
    "envio_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,

    CONSTRAINT "email_envio_anexos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_envios_empresa_id_enviado_em_idx" ON "email_envios"("empresa_id", "enviado_em");
CREATE INDEX "email_envios_enviado_em_idx" ON "email_envios"("enviado_em");
CREATE INDEX "email_envio_anexos_envio_id_idx" ON "email_envio_anexos"("envio_id");

ALTER TABLE "email_envios" ADD CONSTRAINT "email_envios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_parceiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_envio_anexos" ADD CONSTRAINT "email_envio_anexos_envio_id_fkey" FOREIGN KEY ("envio_id") REFERENCES "email_envios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
