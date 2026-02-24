import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAi } from "@/lib/ai";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const suggestNcm = searchParams.get("suggestNcm") === "true";

  try {
    // 1. Buscar produtos similares (para autocomplete e verificação de duplicidade)
    const matches = await prisma.produto.findMany({
      where: {
        nome: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 5,
      select: {
        id: true,
        nome: true,
        ncm: true,
        marca: true
      }
    });

    let suggestion = null;

    // 2. Se solicitado, sugerir NCM via IA
    if (suggestNcm && query.length > 3) {
      const prompt = `Sugira apenas o código NCM (8 dígitos numéricos) para o seguinte produto: "${query}". Responda APENAS o número, sem texto adicional.`;
      // Tentar Gemini primeiro, depois OpenAI
      suggestion = await runAi(prompt, "gemini");
      if (suggestion.includes("Chave") || suggestion.includes("Sem resposta")) {
         suggestion = await runAi(prompt, "openai");
      }
      
      // Limpar a resposta da IA para garantir que seja apenas números
      suggestion = suggestion.replace(/\D/g, '').slice(0, 8);
    }

    return NextResponse.json({
      matches,
      suggestedNcm: suggestion,
      isDuplicate: matches.some(m => m.nome.toLowerCase() === query.toLowerCase())
    });
  } catch (error) {
    console.error("Erro no autocomplete de produtos:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
