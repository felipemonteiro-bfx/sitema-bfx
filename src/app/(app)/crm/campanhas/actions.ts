"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { ESTAGIOS_ORDEM, type EstagioCrm, type SegmentoFiltro } from "@/lib/crm";
import { NIVEIS_FIDELIDADE, nivelParaFaixaPontos, type NivelFidelidade } from "@/lib/fidelidade";
import { contarAlvo, enviarCampanha } from "@/lib/campanha-service";

function filtroFromForm(formData: FormData): SegmentoFiltro {
  const estagio = String(formData.get("estagio") || "");
  const empresa = Number(formData.get("empresa") || 0);
  const tag = Number(formData.get("tag") || 0);
  const comprou = String(formData.get("comprou") || "");
  const nivel = String(formData.get("nivel") || "");
  const filtro: SegmentoFiltro = {};
  if ((ESTAGIOS_ORDEM as string[]).includes(estagio)) filtro.estagios = [estagio as EstagioCrm];
  if (empresa > 0) filtro.empresaParceiraId = empresa;
  if (tag > 0) filtro.tagIds = [tag];
  if (comprou === "sim") filtro.comprou = true;
  else if (comprou === "nao") filtro.comprou = false;
  if ((NIVEIS_FIDELIDADE as string[]).includes(nivel)) {
    filtro.pontosRange = nivelParaFaixaPontos(nivel as NivelFidelidade);
  }
  return filtro;
}

/** Cria uma campanha (rascunho ou agendada) a partir do segmento e da mensagem. */
export async function criarCampanha(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const nome = String(formData.get("nome") || "").trim();
  const mensagem = String(formData.get("mensagem") || "").trim();
  if (!nome || !mensagem) redirect("/crm/campanhas?erro=dados");

  // Agendamento opcional (input datetime-local). Só agenda se for no futuro.
  const agendarStr = String(formData.get("agendadaPara") || "").trim();
  let agendadaPara: Date | null = null;
  if (agendarStr) {
    const d = new Date(agendarStr);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) agendadaPara = d;
  }

  const filtro = filtroFromForm(formData);
  const totalAlvo = await contarAlvo(filtro);

  await prisma.campanha.create({
    data: {
      nome,
      mensagem,
      canal: "whatsapp",
      filtroJson: JSON.stringify(filtro),
      status: agendadaPara ? "agendada" : "rascunho",
      agendadaPara,
      totalAlvo,
    },
  });
  revalidatePath("/crm/campanhas");
}

/** Dispara uma campanha (envia WhatsApp ao segmento). */
export async function dispararCampanha(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const campanhaId = Number(formData.get("campanhaId") || 0);
  if (!campanhaId) return;
  await enviarCampanha(campanhaId);
  revalidatePath("/crm/campanhas");
}

/** Exclui uma campanha (e seus envios via cascade). */
export async function excluirCampanha(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const campanhaId = Number(formData.get("campanhaId") || 0);
  if (!campanhaId) return;
  await prisma.campanha.delete({ where: { id: campanhaId } });
  revalidatePath("/crm/campanhas");
}
