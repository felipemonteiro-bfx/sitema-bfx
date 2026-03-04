/**
 * IA de pré-atendimento WhatsApp: usa catálogo de produtos para responder clientes.
 * Integra com runAi (OpenAI/Gemini) e enviarWhatsAppTexto.
 */

import { prisma } from "@/lib/db";
import { runAi } from "@/lib/ai";
import { enviarWhatsAppTexto } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";

const MAX_RESPONSE_CHARS = 1500;
const CATALOG_LIMIT = 80;

/** Monta resumo do catálogo para contexto da IA */
export async function obterCatalogoParaIA(search?: string): Promise<string> {
  const produtos = await prisma.produto.findMany({
    where: search
      ? { nome: { contains: search, mode: "insensitive" } }
      : undefined,
    select: { nome: true, categoria: true, valorVenda: true, qtdEstoque: true, marca: true },
    orderBy: { nome: "asc" },
    take: CATALOG_LIMIT,
  });
  if (produtos.length === 0) {
    return "Nenhum produto cadastrado no momento.";
  }
  const linhas = produtos.map((p) => {
    const preco = p.valorVenda != null ? formatBRL(p.valorVenda) : "consulte";
    const estoque = p.qtdEstoque != null ? `estoque: ${p.qtdEstoque}` : "";
    const cat = p.categoria ? ` | ${p.categoria}` : "";
    return `- ${p.nome}${cat} | ${preco} ${estoque}`.trim();
  });
  return linhas.join("\n");
}

const SYSTEM_PROMPT = `Você é um assistente de pré-atendimento amigável da BFX Shop.
Responda de forma curta e amigável em português do Brasil.
Use os dados do catálogo abaixo para informar produtos, preços e disponibilidade.
Se o cliente pedir para falar com um humano ou vendedor, diga: "Entendido! Um vendedor entrará em contato em breve. Obrigado por falar conosco."
Mantenha a resposta concisa (idealmente até 4-5 linhas) para WhatsApp. Não exceda ${MAX_RESPONSE_CHARS} caracteres.`;

/** Gera resposta da IA para a mensagem do cliente */
export async function gerarRespostaPreAtendimento(
  mensagemCliente: string,
  nomeContato?: string
): Promise<string> {
  const search = mensagemCliente.trim().length > 2 ? mensagemCliente.trim() : undefined;
  const catalogo = await obterCatalogoParaIA(search);

  const provider = "gemini";
  const cfg = await prisma.config.findFirst();
  if (!cfg?.geminiKey) return "Chave Gemini não configurada.";

  const ctx = nomeContato ? `Cliente: ${nomeContato}. ` : "";
  const userPrompt = `${ctx}Mensagem recebida: "${mensagemCliente}"

CATÁLOGO DE PRODUTOS (nome, categoria, preço, estoque):
${catalogo}

Responda de forma amigável e objetiva baseado na mensagem e no catálogo.`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
  let resposta = await runAi(fullPrompt, provider);
  if (resposta.length > MAX_RESPONSE_CHARS) {
    resposta = resposta.slice(0, MAX_RESPONSE_CHARS - 3) + "...";
  }
  return resposta || "Em que posso ajudar? Consulte nosso catálogo de produtos.";
}

/** Processa mensagem recebida e envia resposta via WhatsApp */
export async function processarMensagemRecebida(
  telefone: string,
  mensagem: string,
  nomeContato?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!mensagem || typeof mensagem !== "string") {
    return { ok: false, error: "Mensagem vazia" };
  }
  try {
    const resposta = await gerarRespostaPreAtendimento(mensagem, nomeContato);
    const enviado = await enviarWhatsAppTexto(telefone, resposta);
    return enviado ? { ok: true } : { ok: false, error: "Falha ao enviar via Evolution" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PreAtendimento] Erro:", err);
    return { ok: false, error: msg };
  }
}
