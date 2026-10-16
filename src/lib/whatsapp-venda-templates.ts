import { comFallback, TEMPLATES } from "@/lib/whatsapp-templates";
import type { WhatsAppTemplate } from "@/lib/whatsapp-provider";

/** Cada documento mantém seu próprio texto e os parâmetros aprovados na Meta. */
export function montarMensagensDocumentosVenda(input: {
  nome: string;
  autoRecibo: boolean;
  autoBoleto: boolean;
  reciboUrl?: string;
  assinaturaUrl?: string;
  boletoUrl?: string;
}): WhatsAppTemplate[] {
  const mensagens: WhatsAppTemplate[] = [];
  if (input.autoRecibo) {
    if (input.assinaturaUrl) {
      // Não há template aprovado para assinatura. O fluxo de envio limita
      // texto livre à janela de atendimento; fora dela registra a pendência.
      mensagens.push(comFallback("", [], `Olá! Segue o link para assinar sua autorização de desconto em folha: ${input.assinaturaUrl}`));
    } else if (input.reciboUrl) {
      mensagens.push(comFallback(TEMPLATES.recibo, [input.nome, input.reciboUrl], `Olá! Segue seu recibo de venda: ${input.reciboUrl}`));
    }
  }
  if (input.autoBoleto && input.boletoUrl) {
    mensagens.push(comFallback(TEMPLATES.boleto, [input.nome, input.boletoUrl], `Olá! Seu boleto está disponível: ${input.boletoUrl}`));
  }
  return mensagens;
}
