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
      // Template próprio da autorização; não confundir com recibo de pagamento.
      mensagens.push(comFallback(TEMPLATES.assinaturaFolha, [input.nome, input.assinaturaUrl], `Olá! Segue o link para assinar sua autorização de desconto em folha: ${input.assinaturaUrl}`));
    } else if (input.reciboUrl) {
      mensagens.push(comFallback(TEMPLATES.recibo, [input.nome, input.reciboUrl], `Olá! Segue seu recibo de venda: ${input.reciboUrl}`));
    }
  }
  if (input.autoBoleto && input.boletoUrl) {
    mensagens.push(comFallback(TEMPLATES.boleto, [input.nome, input.boletoUrl], `Olá! Seu boleto está disponível: ${input.boletoUrl}`));
  }
  return mensagens;
}
