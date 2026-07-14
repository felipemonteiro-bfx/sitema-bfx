/**
 * Envio de campanhas de WhatsApp por segmento (CRM Fase 3).
 *
 * Reusa `buildClienteSegmentWhere` (mesmo motor de segmentação do /crm) e o
 * provider de WhatsApp (`enviarWhatsAppTexto` → Evolution/Meta). Cada envio é
 * registrado em `CampanhaEnvio` (idempotente por campanha+cliente).
 */
import { prisma } from "@/lib/db";
import { enviarWhatsAppTexto } from "@/lib/whatsapp";
import { buildClienteSegmentWhere, type SegmentoFiltro } from "@/lib/crm";
import type { Prisma } from "@/generated/prisma";
import { logCron } from "@/lib/logger";

const MAX_ALVO = 1000;

/** Substitui {nome} (e {primeiroNome}) na mensagem. */
export function renderMensagem(mensagem: string, nome: string): string {
  const primeiro = nome.split(" ")[0] ?? nome;
  return mensagem.split("{nome}").join(nome).split("{primeiroNome}").join(primeiro);
}

/** Parseia o filtro salvo da campanha, tolerante a JSON inválido. */
export function parseFiltro(filtroJson: string): SegmentoFiltro {
  try {
    const obj = JSON.parse(filtroJson);
    return obj && typeof obj === "object" ? (obj as SegmentoFiltro) : {};
  } catch {
    return {};
  }
}

/** Conta quantos clientes (com telefone) o segmento atinge. */
export async function contarAlvo(filtro: SegmentoFiltro): Promise<number> {
  const where = buildClienteSegmentWhere(filtro) as unknown as Prisma.ClienteWhereInput;
  return prisma.cliente.count({ where: { ...where, telefone: { not: null } } });
}

/**
 * Dispara a campanha: resolve o segmento, envia WhatsApp a cada cliente com
 * telefone e registra cada tentativa. Idempotente — pula quem já recebeu.
 */
export async function enviarCampanha(campanhaId: number): Promise<{
  enviados: number;
  falhas: number;
  semTelefone: number;
}> {
  const campanha = await prisma.campanha.findUnique({ where: { id: campanhaId } });
  if (!campanha) throw new Error("Campanha não encontrada");
  if (campanha.status === "enviando") {
    return { enviados: 0, falhas: 0, semTelefone: 0 };
  }

  const filtro = parseFiltro(campanha.filtroJson);
  const where = buildClienteSegmentWhere(filtro) as unknown as Prisma.ClienteWhereInput;

  const clientes = await prisma.cliente.findMany({
    where,
    select: { id: true, nome: true, telefone: true },
    take: MAX_ALVO,
  });

  await prisma.campanha.update({
    where: { id: campanhaId },
    data: { status: "enviando", totalAlvo: clientes.length },
  });

  // Já enviados (idempotência em caso de reprocessamento).
  const jaEnviados = new Set(
    (
      await prisma.campanhaEnvio.findMany({
        where: { campanhaId, status: "enviado" },
        select: { clienteId: true },
      })
    ).map((e) => e.clienteId)
  );

  let enviados = 0;
  let falhas = 0;
  let semTelefone = 0;

  for (const c of clientes) {
    if (jaEnviados.has(c.id)) continue;

    if (!c.telefone) {
      semTelefone++;
      await prisma.campanhaEnvio.upsert({
        where: { campanhaId_clienteId: { campanhaId, clienteId: c.id } },
        create: { campanhaId, clienteId: c.id, status: "sem_telefone" },
        update: { status: "sem_telefone" },
      });
      continue;
    }

    const texto = renderMensagem(campanha.mensagem, c.nome);
    const ok = await enviarWhatsAppTexto(c.telefone, texto);
    if (ok) enviados++;
    else falhas++;

    await prisma.campanhaEnvio.upsert({
      where: { campanhaId_clienteId: { campanhaId, clienteId: c.id } },
      create: { campanhaId, clienteId: c.id, status: ok ? "enviado" : "falha" },
      update: { status: ok ? "enviado" : "falha", erro: ok ? null : "envio falhou" },
    });
  }

  await prisma.campanha.update({
    where: { id: campanhaId },
    data: { status: "concluida", enviadaEm: new Date(), totalEnviado: enviados },
  });

  logCron("campanha", "concluida", { campanhaId, enviados, falhas, semTelefone });
  return { enviados, falhas, semTelefone };
}
