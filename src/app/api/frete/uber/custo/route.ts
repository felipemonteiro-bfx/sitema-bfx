/**
 * POST /api/frete/uber/custo — captura o custo REAL de uma entrega Uber
 * Direct (Get Delivery Status, nao a cotacao) e lanca esse valor em
 * `Venda.custoEnvio`. Guarda admin igual `src/app/api/admin/backfill-estoque/route.ts`.
 *
 * A entrega continua sendo criada pelo operador no painel da Uber — aqui so
 * se captura o custo dela a partir de um delivery id ja existente.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getUberDirectConfig } from "@/lib/uber";
import { registrarCustoEntregaUber } from "@/lib/uber-entrega";
import { mensagemFalhaCustoUber, statusHttpParaFalhaCustoUber } from "@/lib/uber-custo-entrega";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado. Requer perfil admin." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo invalido." }, { status: 400 });
  }

  const { vendaId, deliveryId } = (body ?? {}) as { vendaId?: unknown; deliveryId?: unknown };
  const vendaIdNum = Number(vendaId);
  if (!Number.isInteger(vendaIdNum) || vendaIdNum <= 0) {
    return NextResponse.json({ error: "vendaId invalido." }, { status: 400 });
  }
  if (typeof deliveryId !== "string" || !deliveryId.trim()) {
    return NextResponse.json({ error: "deliveryId invalido." }, { status: 400 });
  }

  const config = await getUberDirectConfig();
  if (!config) {
    return NextResponse.json(
      { motivo: "sem_credencial", mensagem: mensagemFalhaCustoUber("sem_credencial") },
      { status: statusHttpParaFalhaCustoUber("sem_credencial") }
    );
  }

  const venda = await prisma.venda.findUnique({ where: { id: vendaIdNum }, select: { id: true } });
  if (!venda) {
    return NextResponse.json({ error: "Venda nao encontrada." }, { status: 404 });
  }

  const resultado = await registrarCustoEntregaUber({
    config,
    vendaId: vendaIdNum,
    deliveryId: deliveryId.trim(),
  });

  if (!resultado.gravado) {
    return NextResponse.json(
      { motivo: resultado.motivo, mensagem: resultado.mensagem },
      { status: resultado.httpStatus }
    );
  }

  return NextResponse.json(resultado, { status: 200 });
}
