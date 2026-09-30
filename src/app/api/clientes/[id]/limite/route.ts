import { NextRequest, NextResponse } from "next/server";
import { payloadLimiteCliente } from "@/lib/consignado-db";
import { parseDataIsoUtc } from "@/lib/data-input";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clienteId = Number(id);

  try {
    // `?data=AAAA-MM-DD`: data da venda, que escolhe a regra vigente da empresa. Ausente ou
    // inválida, vale hoje.
    const data = parseDataIsoUtc(request.nextUrl.searchParams.get("data")) ?? new Date();
    const payload = await payloadLimiteCliente(clienteId, data);
    if (!payload) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Erro ao consultar limite" }, { status: 500 });
  }
}
