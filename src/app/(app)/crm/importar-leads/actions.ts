"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";

/** Divide uma linha por ; , tab ou múltiplos espaços — o primeiro separador encontrado. */
function dividirLinha(linha: string): string[] {
  for (const sep of [";", "\t", ","]) {
    if (linha.includes(sep)) return linha.split(sep).map((c) => c.trim());
  }
  return [linha.trim()];
}

function soDigitos(s: string): string {
  return s.split("").filter((c) => c >= "0" && c <= "9").join("");
}

/**
 * Importa uma lista de funcionários (colaboradores) de uma empresa parceira como LEADS.
 * Cada linha do texto: Nome; Matrícula; Telefone  (separador ; , ou tab).
 * Cria `Cliente` com estagioCrm="novo_lead", origem="import_funcionarios", vinculado à empresa.
 * Deduplica por nome (case-insensitive) — se já existe, apenas garante o vínculo/origem.
 */
export async function importarLeads(formData: FormData): Promise<void> {
  await requireAdminOrThrow();

  const empresaId = Number(formData.get("empresaId") || 0);
  const texto = String(formData.get("lista") || "");
  if (!empresaId || !texto.trim()) {
    redirect("/crm/importar-leads?erro=dados");
  }

  const empresa = await prisma.empresaParceira.findUnique({ where: { id: empresaId } });
  if (!empresa) redirect("/crm/importar-leads?erro=empresa");

  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let criados = 0;
  let vinculados = 0;
  let ignorados = 0;

  for (const linha of linhas) {
    const cols = dividirLinha(linha);
    const nome = (cols[0] || "").trim().toLocaleUpperCase("pt-BR");
    if (!nome) {
      ignorados++;
      continue;
    }
    const matricula = (cols[1] || "").trim() || null;
    const telefone = cols[2] ? soDigitos(cols[2]) || null : null;

    const existente = await prisma.cliente.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
      select: { id: true, empresaParceiraId: true },
    });

    if (existente) {
      // Já existe: garante vínculo com a empresa e origem, sem rebaixar cliente para lead.
      await prisma.cliente.update({
        where: { id: existente.id },
        data: {
          empresaParceiraId: existente.empresaParceiraId ?? empresaId,
          matricula: matricula ?? undefined,
          telefone: telefone ?? undefined,
        },
      });
      vinculados++;
      continue;
    }

    await prisma.cliente.create({
      data: {
        nome,
        tipo: "PF",
        matricula,
        telefone,
        empresa: empresa!.nome,
        empresaParceiraId: empresaId,
        estagioCrm: "novo_lead",
        origem: "import_funcionarios",
      },
    });
    criados++;
  }

  revalidatePath("/crm");
  redirect(`/crm/importar-leads?ok=1&criados=${criados}&vinculados=${vinculados}&ignorados=${ignorados}`);
}
