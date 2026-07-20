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
import { contarContatosUnicos24h } from "@/lib/whatsapp-mensagem";

const MAX_ALVO = 1000;

/**
 * Teto de clientes únicos contatados por 24h no messaging tier inicial da Meta.
 * O limite é COMPARTILHADO com os envios transacionais (lembrete de parcela,
 * cobrança, aniversário) — por isso a reserva abaixo.
 * Sobe para 10.000 automaticamente com histórico de qualidade boa.
 */
export const LIMITE_TIER_24H = 1000;

/** Folga que campanhas de marketing não consomem, para não sufocar o transacional. */
export const RESERVA_TRANSACIONAL = 150;

/** Verifica se uma campanha de `alvo` destinatários cabe na cota das próximas 24h. */
export async function verificarCota(alvo: number): Promise<{
  cabe: boolean;
  disponivel: number;
  usados: number;
}> {
  const usados = await contarContatosUnicos24h();
  const disponivel = Math.max(0, LIMITE_TIER_24H - RESERVA_TRANSACIONAL - usados);
  return { cabe: alvo <= disponivel, disponivel, usados };
}

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

  const cota = await verificarCota(clientes.length);
  if (!cota.cabe) {
    await prisma.campanha.update({
      where: { id: campanhaId },
      data: { status: "rascunho" },
    });
    logCron("campanha", "cota_excedida", {
      campanhaId,
      alvo: clientes.length,
      disponivel: cota.disponivel,
      usados: cota.usados,
    });
    throw new Error(
      `Campanha excede a cota de 24h da Meta: ${clientes.length} destinatários, ${cota.disponivel} disponíveis.`
    );
  }

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
