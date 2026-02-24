import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

interface SugestaoItem {
  id: number;
  nome: string;
  valorVenda: number;
  label: string;
  diferenca?: number;
  economia?: number;
}

interface SugestoesResponse {
  upsell: SugestaoItem[];
  crossSell: SugestaoItem[];
  bundle?: {
    produtos: SugestaoItem[];
    valorTotal: number;
    economiaBundle: number;
    label: string;
  };
  perfilCliente?: {
    renda: number | null;
    capacidadeCompra: number;
    ticketMedio: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const produtoId = Number(searchParams.get("produtoId"));
  const clienteId = Number(searchParams.get("clienteId"));

  if (!produtoId) return NextResponse.json({ upsell: [], crossSell: [] });

  try {
    const config = await prisma.config.findFirst();

    const produtoRef = await prisma.produto.findUnique({
      where: { id: produtoId },
      select: { id: true, nome: true, categoria: true, valorVenda: true, marca: true },
    });

    if (!produtoRef) return NextResponse.json({ upsell: [], crossSell: [] });

    let cliente: { renda: number | null } | null = null;
    let historicoCliente = "";
    let ticketMedio = 0;
    let produtosAnteriores: string[] = [];

    if (clienteId) {
      cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { renda: true },
      });

      const vendasAnteriores = await prisma.venda.findMany({
        where: { clienteId },
        orderBy: { dataVenda: "desc" },
        take: 10,
        include: { itens: true },
      });

      let totalGasto = 0;
      vendasAnteriores.forEach((v) => {
        if (v.itens && v.itens.length > 0) {
          v.itens.forEach((item) => {
            produtosAnteriores.push(item.produtoNome);
            totalGasto += item.subtotal;
          });
        } else if (v.produtoNome) {
          produtosAnteriores.push(v.produtoNome);
          totalGasto += (v.valorVenda || 0) * (v.quantidade || 1);
        }
        totalGasto += v.valorFrete || 0;
      });

      if (vendasAnteriores.length > 0) {
        ticketMedio = totalGasto / vendasAnteriores.length;
      }

      historicoCliente = produtosAnteriores.slice(0, 10).join(", ");
    }

    const renda = cliente?.renda || 0;
    const capacidadeCompra = renda > 0 ? renda * 0.35 : ticketMedio > 0 ? ticketMedio * 1.3 : (produtoRef.valorVenda || 0) * 2;

    const catalogoAmostra = await prisma.produto.findMany({
      where: {
        id: { not: produtoId },
        qtdEstoque: { gt: 0 },
      },
      select: { id: true, nome: true, categoria: true, valorVenda: true, marca: true, custoPadrao: true },
      take: 50,
    });

    const produtosMesmaCategoria = catalogoAmostra.filter(
      (p) => p.categoria === produtoRef.categoria
    );
    const produtosOutrasCategorias = catalogoAmostra.filter(
      (p) => p.categoria !== produtoRef.categoria
    );

    if (!config?.geminiKey) {
      const upsellFallback = produtosMesmaCategoria
        .filter((p) => (p.valorVenda || 0) > (produtoRef.valorVenda || 0))
        .filter((p) => (p.valorVenda || 0) <= capacidadeCompra)
        .sort((a, b) => (a.valorVenda || 0) - (b.valorVenda || 0))
        .slice(0, 2)
        .map((p) => ({
          ...p,
          valorVenda: p.valorVenda || 0,
          label: "Versão Premium",
          diferenca: (p.valorVenda || 0) - (produtoRef.valorVenda || 0),
        }));

      const crossSellFallback = produtosOutrasCategorias
        .filter((p) => (p.valorVenda || 0) <= capacidadeCompra * 0.3)
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .map((p) => ({
          ...p,
          valorVenda: p.valorVenda || 0,
          label: "Combina com sua compra",
        }));

      return NextResponse.json({
        upsell: upsellFallback,
        crossSell: crossSellFallback,
        perfilCliente: clienteId
          ? {
              renda,
              capacidadeCompra: Math.round(capacidadeCompra * 100) / 100,
              ticketMedio: Math.round(ticketMedio * 100) / 100,
            }
          : undefined,
      } as SugestoesResponse);
    }

    const google = createGoogleGenerativeAI({ apiKey: config.geminiKey });

    const prompt = `
Você é um ESPECIALISTA em técnicas de vendas da BFX, focado em AUMENTAR O TICKET MÉDIO.
Sua missão é sugerir produtos usando estratégias comprovadas de upsell, cross-sell e bundle.

═══════════════════════════════════════════════════════════════
PRODUTO SENDO COMPRADO AGORA:
═══════════════════════════════════════════════════════════════
- Nome: ${produtoRef.nome}
- Categoria: ${produtoRef.categoria || "Geral"}
- Marca: ${produtoRef.marca || "N/A"}
- Preço: R$ ${produtoRef.valorVenda}

═══════════════════════════════════════════════════════════════
PERFIL FINANCEIRO DO CLIENTE:
═══════════════════════════════════════════════════════════════
- Renda Mensal: ${renda > 0 ? `R$ ${renda.toFixed(2)}` : "Não informada"}
- Capacidade de Compra Sugerida: R$ ${capacidadeCompra.toFixed(2)}
- Ticket Médio Histórico: ${ticketMedio > 0 ? `R$ ${ticketMedio.toFixed(2)}` : "Primeira compra"}

HISTÓRICO DE COMPRAS (produtos anteriores):
${historicoCliente || "Cliente novo - sem histórico"}

═══════════════════════════════════════════════════════════════
CATÁLOGO DISPONÍVEL:
═══════════════════════════════════════════════════════════════
MESMA CATEGORIA (${produtoRef.categoria || "Geral"}):
${produtosMesmaCategoria.map((p) => `ID:${p.id} | ${p.nome} | R$${p.valorVenda} | Marca:${p.marca || "N/A"}`).join("\n") || "Nenhum produto"}

OUTRAS CATEGORIAS (para cross-sell):
${produtosOutrasCategorias.slice(0, 25).map((p) => `ID:${p.id} | ${p.nome} | Cat:${p.categoria} | R$${p.valorVenda}`).join("\n")}

═══════════════════════════════════════════════════════════════
ESTRATÉGIAS DE VENDA - USE TODAS QUE SE APLICAREM:
═══════════════════════════════════════════════════════════════

1. **ANCHOR PRICING (Âncora de Preço)**
   - Mostre primeiro a opção MAIS CARA que cabe na capacidade
   - Isso faz a opção intermediária parecer mais acessível

2. **UPGRADE PATH (Caminho de Upgrade)**
   - "Por apenas +R$ X, leve a versão [benefício]"
   - Mostre a DIFERENÇA de preço, não o preço total
   - Foque no benefício adicional, não no custo

3. **COMPLEMENTARY CROSS-SELL**
   - Sugira produtos que COMPLETAM a experiência
   - Ex: Celular → Capinha, Película, Carregador
   - Priorize itens de ALTA MARGEM

4. **BUNDLE PSICOLÓGICO**
   - Agrupe produto principal + complementares
   - Mostre "economia" mesmo que pequena
   - Use números específicos: "Economize R$ 47,00"

5. **PERFIL-BASED SUGGESTIONS**
   - Se cliente já comprou algo antes, sugira a EVOLUÇÃO
   - Se tem renda alta, não tenha medo de sugerir premium
   - Se ticket médio é alto, cliente aceita gastar mais

═══════════════════════════════════════════════════════════════
RESPOSTA OBRIGATÓRIA (JSON):
═══════════════════════════════════════════════════════════════

{
  "upsell": [
    {
      "id": number,
      "nome": string,
      "valorVenda": number,
      "label": string (ex: "Versão Pro - +R$ 200 por 2x mais memória"),
      "diferenca": number (diferença de preço vs produto atual)
    }
  ],
  "crossSell": [
    {
      "id": number,
      "nome": string,
      "valorVenda": number,
      "label": string (ex: "Essencial - 90% dos clientes levam junto")
    }
  ],
  "bundle": {
    "produtos": [{"id": number, "nome": string, "valorVenda": number}],
    "valorTotal": number,
    "economiaBundle": number (valor "economizado" - pode ser simbólico),
    "label": string (ex: "Kit Completo - Economize R$ 89")
  }
}

REGRAS IMPORTANTES:
- UPSELL: 1-2 produtos da MESMA categoria, preço MAIOR, dentro da capacidade
- CROSS-SELL: 2-3 produtos COMPLEMENTARES de outras categorias
- BUNDLE: Opcional, só se fizer sentido combinar 2-3 produtos
- Labels devem ser PERSUASIVOS e ESPECÍFICOS
- NUNCA sugira produtos acima de ${Math.round(capacidadeCompra * 1.2)} (capacidade + 20%)
`;

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
    });

    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(jsonStr);

    const response: SugestoesResponse = {
      upsell: suggestions.upsell || [],
      crossSell: suggestions.crossSell || [],
      bundle: suggestions.bundle || undefined,
      perfilCliente: clienteId
        ? {
            renda,
            capacidadeCompra: Math.round(capacidadeCompra * 100) / 100,
            ticketMedio: Math.round(ticketMedio * 100) / 100,
          }
        : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro AI Sugestões:", error);
    return NextResponse.json({ upsell: [], crossSell: [] });
  }
}
