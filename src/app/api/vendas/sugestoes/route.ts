import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const produtoId = Number(searchParams.get("produtoId"));
  const clienteId = Number(searchParams.get("clienteId"));
  
  if (!produtoId) return NextResponse.json({ upsell: [], crossSell: [] });

  try {
    const config = await prisma.config.findFirst();
    
    // 1. Dados do produto de referência
    const produtoRef = await prisma.produto.findUnique({
      where: { id: produtoId },
      select: { id: true, nome: true, categoria: true, valorVenda: true, marca: true }
    });

    if (!produtoRef) return NextResponse.json({ upsell: [], crossSell: [] });

    // 2. Histórico do cliente (últimas 5 compras)
    let historicoCliente = "";
    if (clienteId) {
      const vendasAnteriores = await prisma.venda.findMany({
        where: { clienteId },
        orderBy: { dataVenda: 'desc' },
        take: 5,
        select: { produtoNome: true, valorVenda: true }
      });
      historicoCliente = vendasAnteriores.map(v => `${v.produtoNome} (R$ ${v.valorVenda})`).join(", ");
    }

    // 3. Catálogo de referência para a IA (amostra inteligente)
    // Pegamos produtos da mesma categoria, marcas similares e itens populares/aleatórios
    const catalogoAmostra = await prisma.produto.findMany({
      where: {
        id: { not: produtoId },
        qtdEstoque: { gt: 0 }
      },
      select: { id: true, nome: true, categoria: true, valorVenda: true, marca: true },
      take: 40
    });

    // Se não tiver chave Gemini, cai no fallback de regras básicas
    if (!config?.geminiKey) {
      const upsellFallback = catalogoAmostra
        .filter(p => p.categoria === produtoRef.categoria && (p.valorVenda || 0) > (produtoRef.valorVenda || 0))
        .sort((a, b) => (a.valorVenda || 0) - (b.valorVenda || 0))
        .slice(0, 2);

      const crossSellFallback = catalogoAmostra
        .filter(p => p.id !== produtoId && !upsellFallback.find(u => u.id === p.id))
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      return NextResponse.json({
        upsell: upsellFallback.map(p => ({ ...p, label: 'Modelo Superior' })),
        crossSell: crossSellFallback.map(p => ({ ...p, label: 'Sugestão BFX' }))
      });
    }

    // 4. Inteligência Artificial (Gemini)
    const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });
    
    const prompt = `
      Você é um especialista em vendas e e-commerce da BFX. 
      Sua tarefa é sugerir produtos para aumentar o ticket médio (Upsell) e agregar valor (Cross-sell).

      PRODUTO SENDO COMPRADO AGORA:
      - Nome: ${produtoRef.nome}
      - Categoria: ${produtoRef.categoria}
      - Marca: ${produtoRef.marca}
      - Preço: R$ ${produtoRef.valorVenda}

      HISTÓRICO DE COMPRAS DO CLIENTE:
      ${historicoCliente || "Nenhum histórico disponível."}

      CATÁLOGO DE PRODUTOS DISPONÍVEIS (Amostra):
      ${catalogoAmostra.map(p => `ID:${p.id} | ${p.nome} | Cat:${p.categoria} | Preço:R$${p.valorVenda}`).join("\n")}

      REGRAS:
      1. UPSELL: Escolha 1 ou 2 produtos que sejam da mesma categoria ou tipo, porém mais caros (premium) que o produto atual.
      2. CROSS-SELL: Escolha 1 ou 2 produtos que combinem logicamente com o produto atual ou com o histórico do cliente.
      3. Responda APENAS um JSON válido no formato:
      {
        "upsell": [{"id": number, "nome": string, "valorVenda": number, "label": string}],
        "crossSell": [{"id": number, "nome": string, "valorVenda": number, "label": string}]
      }
      No campo "label", use chamadas curtas como "Melhor Performance", "Mais Vendido", "Combina com seu Perfil", etc.
    `;

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
    });

    // Limpar o texto caso venha com markdown
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(jsonStr);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error("Erro AI Sugestões:", error);
    return NextResponse.json({ upsell: [], crossSell: [] });
  }
}
