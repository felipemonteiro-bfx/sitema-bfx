-- AlterTable
ALTER TABLE "config" ADD COLUMN     "whatsapp_auto_comemorativas" INTEGER DEFAULT 0,
ADD COLUMN     "whatsapp_auto_primeira_compra" INTEGER DEFAULT 0,
ADD COLUMN     "whatsapp_auto_recompra" INTEGER DEFAULT 0,
ADD COLUMN     "whatsapp_dias_recompra" INTEGER DEFAULT 30,
ADD COLUMN     "whatsapp_meses_ativo_comemorativa" INTEGER DEFAULT 6;
