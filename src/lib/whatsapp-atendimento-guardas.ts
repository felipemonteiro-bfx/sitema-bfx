/**
 * Guardas compartilhadas pelo envio manual do atendimento (texto e mídia):
 * janela de 24 h, provedor oficial e serialização por destinatário.
 */
import { dentroDaJanela24h } from "@/lib/whatsapp-mensagem";
import { resolveWhatsAppProviders } from "@/lib/whatsapp-provider";
import type { WhatsAppProvider } from "@/lib/whatsapp-provider";

/** Intervalo em que uma saída igual ao mesmo número é tratada como repetida. */
export const JANELA_DEDUPE_MS = 90_000;

export const MSG_ACESSO_RESTRITO = "Acesso restrito ao atendimento autorizado.";
const MSG_JANELA = "Janela de resposta encerrada. Aguarde uma nova mensagem do cliente. Envio com tarifa permanece bloqueado.";
const MSG_PROVEDOR = "O envio oficial está indisponível. Confira a conexão nas configurações.";

export type CanalManual = { ok: true; primary: WhatsAppProvider } | { ok: false; message: string };

/** Telefone em dígitos (DDI+DDD+número), como o webhook grava. */
export const telefoneValido = (telefone: string): boolean => /^\d{10,15}$/.test(telefone);

/** Janela de 24 h aberta e provedor primário = Meta oficial. */
export async function verificarCanalManual(telefone: string): Promise<CanalManual> {
  if (!(await dentroDaJanela24h(telefone))) return { ok: false, message: MSG_JANELA };
  const { primary } = await resolveWhatsAppProviders();
  if (!primary || primary.name !== "meta_cloud") return { ok: false, message: MSG_PROVEDOR };
  return { ok: true, primary };
}

/** Lock consultivo por telefone, válido até o fim da transação. */
export async function travarTelefone(tx: { $executeRaw: (s: TemplateStringsArray, ...v: unknown[]) => unknown }, telefone: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${telefone}))`;
}

/** Predicado de citação do dedupe: a mesma frase/arquivo citando outra mensagem NÃO é repetição. */
export function predicadoCitacao(citadaWaId: string | null): { respondeAWaId: string | null } {
  return { respondeAWaId: citadaWaId ?? null };
}
