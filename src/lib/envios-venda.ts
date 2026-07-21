/**
 * Decide quais mensagens de WhatsApp enviar ao concluir uma venda.
 *
 * Extraído da venda-rápida para ficar testável isoladamente. Preserva o
 * comportamento anterior, só reorganizado: recibo OU assinatura, e o boleto
 * (quando houver) vira uma SEGUNDA mensagem em vez de ser concatenado — porque
 * template não comporta concatenação de conteúdo arbitrário.
 *
 * O `fallbackText` de cada envio replica a frase usada hoje dentro da janela
 * de 24h; os `params` alimentam o template (`{{1}}=nome`, `{{2}}=venda`,
 * `{{3}}=URL`) fora da janela.
 */
import { TEMPLATES } from "@/lib/whatsapp-templates";

export type EnvioVenda = { template: string; params: string[]; fallbackText: string };

export type EntradaEnviosVenda = {
  nome: string;
  vendaId: number;
  baseUrl: string;
  autoRecibo: boolean;
  autoBoleto: boolean;
  descontoEmFolha: boolean;
  assinaturaToken: string | null;
  boletoUrl: string | null;
  reciboSig: string;
};

export function montarEnviosVenda(input: EntradaEnviosVenda): EnvioVenda[] {
  const { nome, vendaId, baseUrl, autoRecibo, autoBoleto } = input;
  const idStr = String(vendaId);
  const envios: EnvioVenda[] = [];

  if (autoRecibo) {
    if (input.descontoEmFolha && input.assinaturaToken) {
      const url = `${baseUrl}/assinatura/${input.assinaturaToken}`;
      envios.push({
        template: TEMPLATES.assinatura,
        params: [nome, idStr, url],
        fallbackText: `Olá! Segue o link para assinar sua autorização de desconto em folha: ${url}`,
      });
    } else {
      const sufixo = input.descontoEmFolha ? "&tipo=autorizacao" : "";
      const url = `${baseUrl}/api/recibo?id=${vendaId}&sig=${input.reciboSig}${sufixo}`;
      envios.push({
        template: TEMPLATES.recibo,
        params: [nome, idStr, url],
        fallbackText: `Olá! Segue seu recibo de venda: ${url}`,
      });
    }
  }

  if (input.boletoUrl && autoBoleto) {
    envios.push({
      template: TEMPLATES.boleto,
      params: [nome, idStr, input.boletoUrl],
      fallbackText: `Olá! Seu boleto da venda #${vendaId} foi gerado. Acesse: ${input.boletoUrl}`,
    });
  }

  return envios;
}
