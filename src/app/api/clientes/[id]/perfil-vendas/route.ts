import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

interface PerfilVendasResponse {
  cliente: {
    id: number;
    nome: string;
    renda: number | null;
    tipo: string | null;
  };
  ultimaVenda: {
    id: number;
    data: string;
    produtos: string[];
    valorTotal: number;
    parcelas: number;
  } | null;
  metricas: {
    ticketMedio: number;
    totalCompras: number;
    valorTotalGasto: number;
    capacidadeCompra: number;
  };
  categoriasFavoritas: string[];
  produtosFrequentes: string[];
  sugestoesProativas: {
    id: number;
    nome: string;
    valorVenda: number;
    motivo: string;
    tipo: "recompra" | "upgrade" | "complementar" | "novo";
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clienteId = Number(id);

  if (!clienteId || isNaN(clienteId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        nome: true,
        renda: true,
        tipo: true,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const vendas = await prisma.venda.findMany({
      where: { clienteId },
      orderBy: { dataVenda: "desc" },
      take: 20,
      include: {
        itens: true,
      },
    });

    let ultimaVenda: PerfilVendasResponse["ultimaVenda"] = null;
    let ticketMedio = 0;
    let valorTotalGasto = 0;
    const produtosComprados: string[] = [];
    const categoriasMap: Record<string, number> = {};

    if (vendas.length > 0) {
      const primeiraVenda = vendas[0];

      const produtosUltimaVenda: string[] = [];
      let valorUltimaVenda = 0;

      if (primeiraVenda.itens && primeiraVenda.itens.length > 0) {
        primeiraVenda.itens.forEach((item) => {
          produtosUltimaVenda.push(item.produtoNome);
          valorUltimaVenda += item.subtotal;
        });
      } else if (primeiraVenda.produtoNome) {
        produtosUltimaVenda.push(primeiraVenda.produtoNome);
        valorUltimaVenda = (primeiraVenda.valorVenda || 0) * (primeiraVenda.quantidade || 1);
      }

      valorUltimaVenda += primeiraVenda.valorFrete || 0;

      ultimaVenda = {
        id: primeiraVenda.id,
        data: primeiraVenda.dataVenda.toISOString().split("T")[0],
        produtos: produtosUltimaVenda,
        valorTotal: valorUltimaVenda,
        parcelas: primeiraVenda.parcelas || 1,
      };

      vendas.forEach((venda) => {
        let valorVenda = 0;

        if (venda.itens && venda.itens.length > 0) {
          venda.itens.forEach((item) => {
            produtosComprados.push(item.produtoNome);
            valorVenda += item.subtotal;
          });
        } else if (venda.produtoNome) {
          produtosComprados.push(venda.produtoNome);
          valorVenda = (venda.valorVenda || 0) * (venda.quantidade || 1);
        }

        valorVenda += venda.valorFrete || 0;
        valorTotalGasto += valorVenda;
      });

      ticketMedio = valorTotalGasto / vendas.length;
    }

    const produtosDetalhados = await prisma.produto.findMany({
      where: {
        nome: { in: produtosComprados },
      },
      select: {
        nome: true,
        categoria: true,
      },
    });

    produtosDetalhados.forEach((p) => {
      if (p.categoria) {
        categoriasMap[p.categoria] = (categoriasMap[p.categoria] || 0) + 1;
      }
    });

    const categoriasFavoritas = Object.entries(categoriasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    const produtoCount: Record<string, number> = {};
    produtosComprados.forEach((p) => {
      produtoCount[p] = (produtoCount[p] || 0) + 1;
    });
    const produtosFrequentes = Object.entries(produtoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome]) => nome);

    const renda = cliente.renda || 0;
    const capacidadeCompra = renda > 0 ? renda * 0.3 : ticketMedio * 1.2;

    let sugestoesProativas: PerfilVendasResponse["sugestoesProativas"] = [];

    const config = await prisma.config.findFirst();

    const catalogoSugestoes = await prisma.produto.findMany({
      where: {
        qtdEstoque: { gt: 0 },
        valorVenda: {
          gt: 0,
          lte: capacidadeCompra > 0 ? capacidadeCompra * 1.5 : undefined,
        },
      },
      select: {
        id: true,
        nome: true,
        valorVenda: true,
        categoria: true,
        marca: true,
      },
      take: 50,
    });

    if (config?.geminiKey && vendas.length > 0) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });

        const prompt = `
Você é um assistente de vendas inteligente da BFX.
Analise o perfil do cliente e sugira 3-4 produtos para oferecer PROATIVAMENTE.

PERFIL DO CLIENTE:
- Nome: ${cliente.nome}
- Renda Mensal: R$ ${renda || "Não informada"}
- Capacidade de Compra Sugerida: R$ ${capacidadeCompra.toFixed(2)}
- Ticket Médio Histórico: R$ ${ticketMedio.toFixed(2)}
- Total de Compras: ${vendas.length}

ÚLTIMA COMPRA:
${ultimaVenda ? `- Data: ${ultimaVenda.data}\n- Produtos: ${ultimaVenda.produtos.join(", ")}\n- Valor: R$ ${ultimaVenda.valorTotal.toFixed(2)}` : "Nenhuma compra registrada"}

PRODUTOS QUE MAIS COMPRA:
${produtosFrequentes.join(", ") || "Nenhum histórico"}

CATEGORIAS FAVORITAS:
${categoriasFavoritas.join(", ") || "Não identificadas"}

CATÁLOGO DISPONÍVEL PARA SUGESTÃO:
${catalogoSugestoes.map((p) => `ID:${p.id} | ${p.nome} | Cat:${p.categoria || "N/A"} | R$${p.valorVenda}`).join("\n")}

REGRAS DE SUGESTÃO:
1. RECOMPRA: Se o cliente compra algo frequentemente, sugira novamente
2. UPGRADE: Se comprou versão básica, sugira versão premium dentro da capacidade
3. COMPLEMENTAR: Sugira acessórios ou produtos que combinam com o que ele já comprou
4. NOVO: Sugira algo novo da categoria favorita que ele ainda não experimentou

Responda APENAS um JSON válido no formato:
{
  "sugestoes": [
    {"id": number, "nome": string, "valorVenda": number, "motivo": string, "tipo": "recompra"|"upgrade"|"complementar"|"novo"}
  ]
}

O "motivo" deve ser uma frase curta e persuasiva para o vendedor usar, como "Cliente sempre compra esse", "Upgrade do último produto", "Combina com o que ele já tem", etc.
`;

        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          prompt,
        });

        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(jsonStr);
        sugestoesProativas = result.sugestoes || [];
      } catch (aiError) {
        console.error("Erro na IA de sugestões proativas:", aiError);
      }
    }

    if (sugestoesProativas.length === 0 && catalogoSugestoes.length > 0) {
      const produtosParaRecompra = catalogoSugestoes.filter((p) =>
        produtosFrequentes.includes(p.nome)
      );

      if (produtosParaRecompra.length > 0) {
        sugestoesProativas.push({
          ...produtosParaRecompra[0],
          valorVenda: produtosParaRecompra[0].valorVenda || 0,
          motivo: "Cliente costuma comprar",
          tipo: "recompra",
        });
      }

      const produtosMesmaCat = catalogoSugestoes.filter(
        (p) =>
          p.categoria &&
          categoriasFavoritas.includes(p.categoria) &&
          !produtosFrequentes.includes(p.nome)
      );

      if (produtosMesmaCat.length > 0) {
        sugestoesProativas.push({
          ...produtosMesmaCat[0],
          valorVenda: produtosMesmaCat[0].valorVenda || 0,
          motivo: "Na categoria favorita",
          tipo: "novo",
        });
      }

      if (sugestoesProativas.length < 3) {
        const outros = catalogoSugestoes
          .filter((p) => !sugestoesProativas.find((s) => s.id === p.id))
          .slice(0, 3 - sugestoesProativas.length);

        outros.forEach((p) => {
          sugestoesProativas.push({
            ...p,
            valorVenda: p.valorVenda || 0,
            motivo: "Produto em destaque",
            tipo: "novo",
          });
        });
      }
    }

    const response: PerfilVendasResponse = {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        renda: cliente.renda,
        tipo: cliente.tipo,
      },
      ultimaVenda,
      metricas: {
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        totalCompras: vendas.length,
        valorTotalGasto: Math.round(valorTotalGasto * 100) / 100,
        capacidadeCompra: Math.round(capacidadeCompra * 100) / 100,
      },
      categoriasFavoritas,
      produtosFrequentes,
      sugestoesProativas: sugestoesProativas.slice(0, 4),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar perfil de vendas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar perfil de vendas" },
      { status: 500 }
    );
  }
}
