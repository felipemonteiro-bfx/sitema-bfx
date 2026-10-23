import type { ResolvedProviders, WhatsAppProvider } from '@/lib/whatsapp-provider';

export const evolutionForaJanelaAtiva = () => process.env.WHATSAPP_EVOLUTION_OUTSIDE_WINDOW === '1';

/** Escolhe antes do envio; nenhuma falha de transporte provoca troca de canal. */
export async function evolutionConectada(canais: ResolvedProviders): Promise<WhatsAppProvider | null> {
  if (!evolutionForaJanelaAtiva()) return null;
  const evo = canais.primary?.name === 'evolution' ? canais.primary : canais.fallback;
  if (evo?.name !== 'evolution' || !evo.isConnected || !await evo.isConnected()) return null;
  return evo;
}

const DOCUMENTOS = new Set(['bfx_assinatura_folha', 'bfx_recibo', 'bfx_boleto', 'bfx_relatorio_empresa']);
export function documentoIndividualEvolution(origem: string, template: string): boolean {
  return ['venda', 'boleto', 'relatorio'].includes(origem) && DOCUMENTOS.has(template);
}
