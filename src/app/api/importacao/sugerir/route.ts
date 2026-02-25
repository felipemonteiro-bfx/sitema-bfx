import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAi } from "@/lib/ai";

const BATCH_SIZE = 15;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const [clientes, produtos] = await Promise.all([
      prisma.cliente.findMany({
        select: { nome: true },
        take: 200,
        orderBy: { nome: "asc" },
      }),
      prisma.produto.findMany({
        select: { nome: true, custoPadrao: true },
        take: 200,
        orderBy: { nome: "asc" },
      }),
    ]);

    const clientesNomes = clientes.map((c) => c.nome);

    const suggested: typeof data = [];
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const batch = data.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      // 1. Match produto → custo padrão quando custo vazio
      for (const row of batch) {
        const p = String(row.produto || "").trim();
        if (p && (Number(row.custo) === 0 || !row.custo)) {
          const match =
            produtos.find((x) => x.nome.toLowerCase() === p.toLowerCase()) ||
            produtos.find(
              (x) =>
                p.toLowerCase().includes(x.nome.toLowerCase()) ||
                x.nome.toLowerCase().includes(p.toLowerCase())
            );
          if (match?.custoPadrao != null) {
            row.custo = String(match.custoPadrao);
          }
        }
      }

      const prompt = `Você é um assistente que padroniza dados de vendas para importação em massa.

TAREFA: Ajuste e sugira correções para as linhas abaixo. Para cada linha, retorne um JSON válido com os campos:
dataVenda, vendedor, cliente, produto, custo, valor, frete, envio, parcelas, antecipada

REGRAS:
- dataVenda: formato AAAA-MM-DD; corrija se inválido
- vendedor: normalize (capitalize, remova espaços extras)
- cliente: corrija typos; se existir nome similar na lista de clientes, use o nome exato. Lista de clientes existentes: ${clientesNomes.slice(0, 50).join(", ")}
- produto: corrija typos; se existir similar, use o nome exato. Produtos existentes (exemplos): ${produtos.slice(0, 30).map((p) => p.nome).join(", ")}
- custo, valor, frete, envio: números decimais; 0 se vazio
- parcelas: inteiro >= 1; sugira 1 se vazio; sugira um valor razoável baseado no valor total
- antecipada: true ou false (S/N ou sim/não = true)

Responda APENAS um array JSON, sem texto adicional. Exemplo: [{"dataVenda":"2026-02-01","vendedor":"Maria","cliente":"João Silva","produto":"Notebook","custo":"2500","valor":"3200","frete":"0","envio":"0","parcelas":"6","antecipada":true}]

LINHAS A PROCESSAR:
${JSON.stringify(batch.map((r: Record<string, unknown>) => ({
  dataVenda: r.dataVenda,
  vendedor: r.vendedor,
  cliente: r.cliente,
  produto: r.produto,
  custo: r.custo,
  valor: r.valor,
  frete: r.frete,
  envio: r.envio,
  parcelas: r.parcelas,
  antecipada: r.antecipada,
})))}`;

      let text = "";
      try {
        text = await runAi(prompt, "gemini");
      } catch {
        text = await runAi(prompt, "openai").catch(() => "");
      }

      if (text.includes("Chave") || text.includes("Sem resposta")) {
        suggested.push(...batch);
        continue;
      }

      // Extrair JSON da resposta
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>[];
          for (let i = 0; i < batch.length; i++) {
            const orig = batch[i] as Record<string, unknown> & { id?: string };
            const p = parsed[i];
            if (!p) {
              suggested.push(orig);
              continue;
            }
            suggested.push({
              id: orig.id,
              dataVenda: p.dataVenda ?? orig.dataVenda,
              vendedor: String(p.vendedor ?? orig.vendedor ?? "").trim(),
              cliente: String(p.cliente ?? orig.cliente ?? "").trim(),
              produto: String(p.produto ?? orig.produto ?? "").trim(),
              custo: String(p.custo ?? orig.custo ?? "0"),
              valor: String(p.valor ?? orig.valor ?? "0"),
              frete: String(p.frete ?? orig.frete ?? "0"),
              envio: String(p.envio ?? orig.envio ?? "0"),
              parcelas: String(p.parcelas ?? orig.parcelas ?? "1"),
              antecipada: p.antecipada === true || String(p.antecipada ?? "").toUpperCase().startsWith("S"),
            });
          }
        } catch {
          suggested.push(...batch);
        }
      } else {
        suggested.push(...batch);
      }
    }

    return NextResponse.json({ data: suggested });
  } catch (error) {
    console.error("Erro ao sugerir com IA:", error);
    return NextResponse.json(
      { error: "Erro ao processar sugestões. Verifique se a chave Gemini está configurada." },
      { status: 500 }
    );
  }
}
