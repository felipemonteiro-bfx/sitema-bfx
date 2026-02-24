import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    for (const row of data) {
      const clienteNome = String(row.cliente || "").trim();
      if (!clienteNome) continue;

      // 1. Garantir que o cliente existe
      let cliente = await prisma.cliente.findFirst({ where: { nome: clienteNome } });
      if (!cliente) {
        cliente = await prisma.cliente.create({ data: { nome: clienteNome, tipo: "PF" } });
      }

      const valorVenda = Number(row.valor || 0);
      const frete = Number(row.frete || 0);
      const custoEnvio = Number(row.envio || 0);
      const custoProduto = Number(row.custo || 0);
      const parcelas = Number(row.parcelas || 1);
      
      const total = valorVenda + frete;
      const valorParcela = parcelas > 0 ? total / parcelas : 0;
      
      // Cálculo básico de lucro para importação (pode ser refinado se necessário)
      const lucro = total - (custoProduto + custoEnvio);

      // 2. Criar a venda
      await prisma.venda.create({
        data: {
          dataVenda: new Date(row.dataVenda),
          vendedor: row.vendedor || "",
          clienteId: cliente.id,
          produtoNome: row.produto || "",
          custoProduto,
          valorVenda,
          valorFrete: frete,
          custoEnvio,
          parcelas,
          valorParcela,
          lucroLiquido: lucro,
          antecipada: row.antecipada ? 1 : 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na importação batch:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
