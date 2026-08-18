import { prisma } from "@/lib/db";

/**
 * Busca de produtos para o agente de WhatsApp: lexical + semântica.
 *
 * O cliente não digita como o cadastro está escrito. Ele manda "tenis" sem
 * acento, "air frier" com erro, ou descreve em vez de nomear — "algo pra
 * fritar sem óleo". Três problemas diferentes, e nenhuma técnica sozinha
 * resolve os três.
 *
 * MEDIDO no catálogo real (237 produtos):
 *
 *   1. `ILIKE` puro: `'%CALCA%'` devolve 0, `'%CALÇA%'` devolve 6. São 82
 *      produtos com acento — um terço do catálogo invisível para quem digita
 *      sem acento, que é como se digita no WhatsApp.
 *
 *   2. Embedding sobre o nome CRU: "algo para fritar sem oleo" trouxe COOKTOP
 *      e MOCHILA FROZEN, enquanto existe FRITADEIRA AIR FRYER no catálogo.
 *      Nomes de cadastro são em CAIXA ALTA e cheios de código de modelo; o
 *      modelo se perde neles.
 *
 *   3. Embedding sobre o nome NORMALIZADO (minúsculas, sem acento): a mesma
 *      consulta trouxe FRITADEIRA ELGIN AIR FRYER no topo, e "perfume
 *      feminino" passou a trazer KIT PERFUME EUDORA em vez do masculino.
 *
 * Daí o desenho: normalizar sempre, casar por texto quando o cliente nomeia o
 * produto, e por significado quando ele descreve.
 */

const MODELO_EMBEDDING = process.env.EMBEDDING_MODELO ?? "bge-m3";
const URL_EMBEDDING = process.env.EMBEDDING_URL;
const CHAVE_EMBEDDING = process.env.EMBEDDING_API_KEY;

export interface ProdutoEncontrado {
  nome: string;
  marca: string | null;
  categoria: string | null;
  valorVenda: number | null;
  qtdEstoque: number | null;
  /** Como o produto foi encontrado — só para log, nunca vai ao cliente. */
  via: "texto" | "significado";
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Busca lexical
// ---------------------------------------------------------------------------

interface LinhaProduto {
  nome: string;
  marca: string | null;
  categoria: string | null;
  valorVenda: number | null;
  qtdEstoque: number | null;
}

/**
 * Substring sem acento, mais similaridade por trigrama para tolerar erro de
 * digitação. `unaccent` e `pg_trgm` já estão instaladas no banco.
 */
async function buscaLexical(termo: string, limite: number): Promise<LinhaProduto[]> {
  const alvo = `%${termo}%`;
  return prisma.$queryRaw<LinhaProduto[]>`
    SELECT nome, marca, categoria,
           valor_venda AS "valorVenda", qtd_estoque AS "qtdEstoque"
      FROM produtos
     WHERE unaccent(lower(nome)) LIKE unaccent(lower(${alvo}))
        OR similarity(unaccent(lower(nome)), unaccent(lower(${termo}))) > 0.28
     ORDER BY similarity(unaccent(lower(nome)), unaccent(lower(${termo}))) DESC,
              nome ASC
     LIMIT ${limite}
  `;
}

// ---------------------------------------------------------------------------
// Busca semântica
// ---------------------------------------------------------------------------

interface CacheDeVetores {
  assinatura: string;
  produtos: LinhaProduto[];
  vetores: number[][];
}

let cache: CacheDeVetores | null = null;

async function embutir(textos: string[]): Promise<number[][]> {
  if (!URL_EMBEDDING || !CHAVE_EMBEDDING) throw new Error("embedding_nao_configurado");
  const res = await fetch(URL_EMBEDDING, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHAVE_EMBEDDING}`,
    },
    body: JSON.stringify({ model: MODELO_EMBEDDING, input: textos }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`embedding_${res.status}`);
  const corpo = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vetores = (corpo.data ?? []).map((d) => d.embedding);
  if (vetores.length !== textos.length) throw new Error("embedding_incompleto");
  return vetores;
}

function cosseno(a: number[], b: number[]): number {
  let s = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return s / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

/**
 * Vetores do catálogo, em memória.
 *
 * São ~237 produtos: cabem de sobra, e recalcular tudo custa uma chamada. A
 * assinatura é quantidade + nomes concatenados — produto novo, renomeado ou
 * removido muda a assinatura e o cache se refaz sozinho. Não há `updated_at`
 * na tabela para usar como relógio.
 */
async function vetoresDoCatalogo(): Promise<CacheDeVetores> {
  const produtos = await prisma.produto.findMany({
    select: {
      nome: true,
      marca: true,
      categoria: true,
      valorVenda: true,
      qtdEstoque: true,
    },
    orderBy: { nome: "asc" },
  });
  const assinatura = `${produtos.length}:${produtos.map((p) => p.nome).join("|")}`;
  if (cache && cache.assinatura === assinatura) return cache;

  const vetores = await embutir(produtos.map((p) => normalizar(p.nome)));
  cache = { assinatura, produtos, vetores };
  return cache;
}

/** Abaixo disto o resultado é ruído: medido, pares sem relação ficam perto de 0,4. */
const CORTE_SEMANTICO = 0.45;

async function buscaSemantica(
  termo: string,
  limite: number,
): Promise<Array<{ produto: LinhaProduto; score: number }>> {
  const { produtos, vetores } = await vetoresDoCatalogo();
  const [consulta] = await embutir([normalizar(termo)]);
  return produtos
    .map((produto, i) => ({ produto, score: cosseno(consulta, vetores[i]) }))
    .filter((r) => r.score >= CORTE_SEMANTICO)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);
}

// ---------------------------------------------------------------------------
// Híbrida
// ---------------------------------------------------------------------------

/**
 * Lexical primeiro, semântica depois.
 *
 * A ordem não é arbitrária: quando o cliente NOMEIA o produto, o casamento por
 * texto é mais preciso que o por significado — "air fryer" acha a fritadeira
 * exata, enquanto o vetor traz também "fone AIR PODS". A semântica entra para
 * o que a lexical não alcança: descrição em vez de nome.
 *
 * Se o embedding falhar ou não estiver configurado, a busca continua só com a
 * lexical. Perder a semântica degrada o resultado; derrubar a busca inteira
 * deixaria o cliente sem resposta.
 */
export async function buscarProdutos(
  termo: string,
  limite: number,
): Promise<ProdutoEncontrado[]> {
  const t = termo.trim();
  if (!t) return [];

  const lexicais = await buscaLexical(t, limite);
  const vistos = new Set(lexicais.map((p) => p.nome));
  const saida: ProdutoEncontrado[] = lexicais.map((p) => ({ ...p, via: "texto" }));

  if (saida.length >= limite) return saida.slice(0, limite);

  try {
    const semanticos = await buscaSemantica(t, limite);
    for (const { produto } of semanticos) {
      if (saida.length >= limite) break;
      if (vistos.has(produto.nome)) continue;
      vistos.add(produto.nome);
      saida.push({ ...produto, via: "significado" });
    }
  } catch (e) {
    console.warn("busca_semantica_indisponivel", (e as Error).message);
  }

  return saida.slice(0, limite);
}
