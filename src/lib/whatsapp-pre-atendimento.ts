/**
 * IA de atendimento pessoal WhatsApp: personalizada por cliente com controle humano.
 */

import { prisma } from "@/lib/db";
import { runAi } from "@/lib/ai";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";

const MAX_RESPONSE_CHARS = 1500;
const CATALOG_LIMIT = 80;

/** Normaliza telefone para comparação (remove formatação, garante 11 dígitos locais) */
function normalizarParaBusca(tel: string): string[] {
  const digits = tel.replace(/\D/g, "");
  const variants: string[] = [digits];
  // sem 55
  if (digits.startsWith("55") && digits.length >= 12) {
    variants.push(digits.slice(2)); // 92984520689
  }
  // com 55
  if (!digits.startsWith("55") && digits.length >= 10) {
    variants.push("55" + digits);
  }
  // sem nono dígito (92 9XXXX → 92 XXXX)
  for (const v of [...variants]) {
    const local = v.startsWith("55") ? v.slice(2) : v;
    if (local.length === 11 && local[2] === "9") {
      const sem9 = local.slice(0, 2) + local.slice(3);
      variants.push(sem9);
      variants.push("55" + sem9);
    }
    if (local.length === 10) {
      variants.push(local.slice(0, 2) + "9" + local.slice(2));
      variants.push("55" + local.slice(0, 2) + "9" + local.slice(2));
    }
  }
  return [...new Set(variants)];
}

/** Busca cliente pelo telefone (tenta múltiplos formatos) */
async function buscarClientePorTelefone(telefone: string) {
  const variants = normalizarParaBusca(telefone);
  for (const v of variants) {
    // busca parcial: o número do banco pode ter formatação diferente
    const cliente = await prisma.cliente.findFirst({
      where: { telefone: { contains: v.replace(/^55/, "") } },
      include: {
        vendas: {
          orderBy: { id: "desc" },
          take: 5,
          include: {
            itens: {
              select: { produtoNome: true },
            },
          },
        },
      },
    });
    if (cliente) return cliente;
  }
  return null;
}

/** Monta contexto do cliente para a IA */
function montarContextoCliente(cliente: Awaited<ReturnType<typeof buscarClientePorTelefone>>) {
  if (!cliente) return null;

  const compras = cliente.vendas.map((v) => {
    const produtos = v.itens.map((i) => i.produtoNome || "item").join(", ");
    return `- ${produtos}`;
  });

  const categorias: string[] = [];

  return {
    nome: cliente.nome.split(" ")[0], // primeiro nome
    nomeCompleto: cliente.nome,
    totalCompras: cliente.vendas.length,
    ultimasCompras: compras.slice(0, 5),
    categoriasFavoritas: categorias.slice(0, 4),
  };
}

/** Monta catálogo com destaque para categorias do cliente */
async function obterCatalogoPersonalizado(categoriasFavoritas?: string[]): Promise<string> {
  const produtos = await prisma.produto.findMany({
    where: { qtdEstoque: { gt: 0 } },
    select: { nome: true, categoria: true, valorVenda: true, qtdEstoque: true, marca: true },
    orderBy: { nome: "asc" },
    take: CATALOG_LIMIT,
  });

  if (produtos.length === 0) return "Nenhum produto disponível no momento.";

  // Ordena: categorias favoritas do cliente primeiro
  const ordenados = categoriasFavoritas?.length
    ? [
        ...produtos.filter((p) => categoriasFavoritas.includes(p.categoria || "")),
        ...produtos.filter((p) => !categoriasFavoritas.includes(p.categoria || "")),
      ]
    : produtos;

  return ordenados
    .map((p) => {
      const preco = p.valorVenda != null ? formatBRL(p.valorVenda) : "consulte";
      const cat = p.categoria ? ` [${p.categoria}]` : "";
      return `- ${p.nome}${cat} | ${preco}`;
    })
    .join("\n");
}

/** Verifica se está em modo atendimento humano */
async function estaEmModoHumano(clienteId: number, takeoverMinutos: number): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { atendimentoHumanoAt: true },
  });
  if (!(cliente as { atendimentoHumanoAt?: Date | null })?.atendimentoHumanoAt) return false;
  const diffMs = Date.now() - (cliente as { atendimentoHumanoAt: Date }).atendimentoHumanoAt.getTime();
  return diffMs < takeoverMinutos * 60 * 1000;
}

/** Marca cliente como em atendimento humano */
export async function marcarAtendimentoHumano(telefone: string): Promise<void> {
  const cliente = await buscarClientePorTelefone(telefone);
  if (!cliente) return;
  await prisma.cliente.update({
    where: { id: cliente.id },
    data: { atendimentoHumanoAt: new Date() } as Record<string, unknown>,
  });
}

/** Processa mensagem recebida e envia resposta via WhatsApp */
export async function processarMensagemRecebida(
  telefone: string,
  mensagem: string,
  nomeContato?: string
): Promise<{ ok: boolean; humano?: boolean; error?: string }> {
  if (!mensagem?.trim()) return { ok: false, error: "Mensagem vazia" };

  try {
    const cfg = await prisma.config.findFirst();
    const takeoverMinutos = (cfg as { whatsappTakeoverMinutos?: number | null })
      ?.whatsappTakeoverMinutos ?? 60;

    // Busca cliente cadastrado
    const cliente = await buscarClientePorTelefone(telefone);

    // Verifica modo humano
    if (cliente) {
      const humano = await estaEmModoHumano(cliente.id, takeoverMinutos);
      if (humano) return { ok: true, humano: true };
    }

    const ctx = montarContextoCliente(cliente);
    const catalogo = await obterCatalogoPersonalizado(ctx?.categoriasFavoritas);
    const nome = ctx?.nome || nomeContato || "cliente";

    const systemPrompt = `Você é um assistente virtual pessoal da BFX Shop, falando diretamente com ${ctx?.nomeCompleto || nomeContato || "um cliente"}.
Trate-o sempre pelo primeiro nome: ${nome}.
Seja amigável, breve e objetivo — respostas curtas para WhatsApp (até 4-5 linhas, máx ${MAX_RESPONSE_CHARS} chars).
Você tem acesso apenas aos dados do próprio cliente, nunca mencione outros clientes.
Se pedir para falar com humano ou vendedor: diga "Perfeito, ${nome}! Vou chamar um vendedor, aguarda um instante." e nada mais.
${
  ctx
    ? `
DADOS DO CLIENTE:
- Nome: ${ctx.nomeCompleto}
- Total de compras: ${ctx.totalCompras}
- Últimas compras: ${ctx.ultimasCompras.join("; ") || "nenhuma ainda"}
- Categorias que mais compra: ${ctx.categoriasFavoritas.join(", ") || "variadas"}
`
    : `CLIENTE: Visitante (não cadastrado). Convide-o a conhecer nossos produtos.`
}`;

    const userPrompt = `Mensagem de ${nome}: "${mensagem}"

CATÁLOGO DISPONÍVEL (em estoque):
${catalogo}

Responda de forma personalizada baseado no histórico e na mensagem.`;

    let resposta = await runAi(`${systemPrompt}\n\n${userPrompt}`, "gemini");
    if (resposta.length > MAX_RESPONSE_CHARS) {
      resposta = resposta.slice(0, MAX_RESPONSE_CHARS - 3) + "...";
    }

    const textoResposta = resposta || `Olá, ${nome}! Como posso ajudar?`;
    const enviado = await enviarWhatsApp({
      telefone,
      clienteId: cliente?.id ?? null,
      origem: "pre_atendimento",
      // Sem template: resposta de IA é conteúdo arbitrário e só pode sair
      // dentro da janela de 24h. Fora dela, `enviarWhatsApp` marca a mensagem
      // como falhou com motivo `janela_expirada`.
      template: { name: "", language: "pt_BR", bodyParams: [], fallbackText: textoResposta },
    });
    return enviado ? { ok: true } : { ok: false, error: "Falha ao enviar" };
  } catch (err) {
    console.error("[PreAtendimento] Erro:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export { obterCatalogoPersonalizado as obterCatalogoParaIA };
