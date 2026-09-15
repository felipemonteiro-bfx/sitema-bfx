import { NextRequest, NextResponse } from "next/server";
import { payloadLimiteCliente } from "@/lib/consignado-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clienteId = Number(id);

  try {
    const payload = await payloadLimiteCliente(clienteId);
    if (!payload) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Erro ao consultar limite" }, { status: 500 });
  }
}
