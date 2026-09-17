-- Último aviso autenticado recebido do webhook do Asaas: a tela de Configurações usa para mostrar
-- se o cadastro no painel do Asaas já está funcionando. Ver
-- docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md (Telas).
ALTER TABLE "config" ADD COLUMN "asaas_webhook_ultimo_aviso_em" TIMESTAMP(3);
