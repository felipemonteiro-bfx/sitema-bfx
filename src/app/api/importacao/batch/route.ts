import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importacaoBatchSchema } from "@/lib/validations/importacao";
import { formaFromLegacyFlags, legacyFlagsFromForma } from "@/lib/forma-pagamento";
import { revalidarVenda, revalidarCliente } from "@/lib/revalidacao";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    if (!Array.isArray(raw)) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const parsed = importacaoBatchSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const msg = first?.path?.length ? `${first.path.join(".")}: ${first.message}` : first?.message ?? "Dados inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      for (const row of data) {
        const clienteNome = row.cliente.trim();
        if (!clienteNome) continue;

        let cliente = await tx.cliente.findFirst({ where: { nome: clienteNome } });
        if (!cliente) {
          cliente = await tx.cliente.create({ data: { nome: clienteNome, tipo: "PF" } });
        }

        const valorVenda = row.valor;
        const frete = row.frete ?? 0;
        const custoEnvio = row.envio ?? 0;
        const custoProduto = row.custo ?? 0;
        const parcelas = row.parcelas ?? 1;
        const temNota = row.temNota ?? false;
        const taxaNota = row.taxaNota ?? 5.97;
        const total = valorVenda + frete;
        const valorParcela = parcelas > 0 ? Math.trunc((total / parcelas) * 100) / 100 : 0;
        const valorDescontoNota = temNota ? Math.trunc((valorVenda * taxaNota / 100) * 100) / 100 : 0;
        const lucro = total - (custoProduto + custoEnvio + valorDescontoNota);

        const vendedorImport = row.vendedor ? await tx.usuario.findFirst({
          where: { OR: [{ username: { equals: row.vendedor, mode: "insensitive" } }, { nomeExibicao: { equals: row.vendedor, mode: "insensitive" } }] },
          select: { id: true },
        }) : null;
        // Importacao nao traz forma de pagamento — derivamos por parcelas (legacy heuristic).
        const formaPagamentoImport = formaFromLegacyFlags({ descontoEmFolha: false, boleto: false, parcelas });
        const flagsImport = legacyFlagsFromForma(formaPagamentoImport);
        await tx.venda.create({
          data: {
            dataVenda: row.dataVenda,
            vendedor: row.vendedor || "",
            vendedorId: vendedorImport?.id ?? null,
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
            temNota,
            taxaNota,
            descontoEmFolha: flagsImport.descontoEmFolha,
            boleto: flagsImport.boleto,
            formaPagamento: formaPagamentoImport,
          },
        });
      }
    });

    // A importacao cria cliente e venda em lote. Invalida o cache de servidor das
    // telas afetadas; o refresh da tela de importacao e do proprio componente.
    revalidarVenda();
    revalidarCliente();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro na importação batch:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
