/**
 * Catalogo unico de colunas do relatorio de vendas (CSV e PDF).
 *
 * Fonte unica de verdade: os dois endpoints (`/api/relatorios/vendas` e
 * `/api/relatorios/vendas/pdf`) derivam cabecalho, celulas e layout deste
 * modulo, em vez de manter listas de colunas duplicadas. O componente client
 * do seletor de colunas tambem importa deste modulo — por isso nenhum import
 * server-only (`@/lib/db`, `@prisma/client`) pode entrar aqui, e a venda e
 * tipada estruturalmente (`VendaRelatorio`), nao pelo tipo gerado do Prisma.
 */

import { valorTotalVenda, produtosTexto, quantidadeTotal, margemVenda } from "@/lib/venda-utils";
import { formaPagamentoLabel, formaFromLegacyFlags, FORMA_PAGAMENTO, type FormaPagamento } from "@/lib/forma-pagamento";
import { formatarDataPura } from "@/lib/data-pura";
import { formatBRL } from "@/lib/utils";

export interface VendaRelatorioItem {
  produtoNome: string;
  quantidade: number;
  subtotal: number;
  /** Coluna NOT NULL no schema (`ItemVenda.custoProduto`); 0 significa "sem dado de custo". */
  custoProduto: number;
}

export interface VendaRelatorioCliente {
  empresa?: string | null;
  nome?: string | null;
  matricula?: string | null;
  renda?: number | null;
}

/** Forma estrutural da venda usada pelo relatorio — nao e o tipo gerado do Prisma. */
export interface VendaRelatorio {
  itens?: VendaRelatorioItem[];
  produtoNome?: string | null;
  quantidade?: number | null;
  valorVenda?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
  custoProduto?: number | null;
  vendedor?: string | null;
  dataVenda: Date;
  parcelas?: number | null;
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
  boleto?: boolean | null;
  status?: string | null;
  cliente?: VendaRelatorioCliente | null;
}

export type ColunaKey =
  | "empresa"
  | "matricula"
  | "nome"
  | "produtos"
  | "qtd"
  | "vendedor"
  | "data"
  | "valorTotal"
  | "parcelas"
  | "formaPagamento"
  | "status"
  | "margemPct"
  | "margemConsignavel";

export type TipoColuna = "texto" | "numero" | "data" | "moeda" | "percentual";

export interface ColunaVenda {
  key: ColunaKey;
  label: string;
  labelCurto: string;
  tipo: TipoColuna;
  /** Peso relativo de largura no PDF — ver calcularLayoutPdf. */
  pesoPdf: number;
  /** Valor cru da celula; quem formata e o renderizador (CSV ou PDF) de cada tipo. */
  valor: (v: VendaRelatorio) => string | number | Date | null;
  /** Sufixo aplicado so no PDF (ex.: "x" em parcelas, para imprimir "3x"). */
  sufixoPdf?: string;
  /** Valor alternativo so para o PDF (ex.: forma de pagamento compacta). */
  valorPdf?: (v: VendaRelatorio) => string | number | Date | null;
}

/**
 * Mesma regra de margem consignavel usada em `src/app/api/clientes/[id]/limite/route.ts`
 * (30% da renda). Mantida como constante nomeada para as duas nao divergirem no futuro.
 */
export const MARGEM_CONSIGNAVEL_FATOR = 0.3;

function resolverForma(v: VendaRelatorio): FormaPagamento {
  return (
    (v.formaPagamento as FormaPagamento | null) ??
    formaFromLegacyFlags({ descontoEmFolha: v.descontoEmFolha, boleto: v.boleto, parcelas: v.parcelas })
  );
}

/** Label compacto da forma de pagamento para caber na coluna do PDF (max 7 chars). */
function formaPagamentoLabelCurto(forma: FormaPagamento): string {
  switch (forma) {
    case FORMA_PAGAMENTO.DESCONTO_FOLHA:
      return "Folha";
    case FORMA_PAGAMENTO.BOLETO:
      return "Boleto";
    case FORMA_PAGAMENTO.PIX:
      return "Pix";
    case FORMA_PAGAMENTO.DINHEIRO:
      return "Dinheiro";
    case FORMA_PAGAMENTO.CARTAO_CREDITO:
      return "Credito";
    case FORMA_PAGAMENTO.CARTAO_DEBITO:
      return "Debito";
    case FORMA_PAGAMENTO.TRANSFERENCIA:
      return "Transf.";
    default:
      return "Outro";
  }
}

/** Ordem CANONICA das colunas (D-04) — usada para cabecalho, celulas e layout do PDF. */
export const COLUNAS_VENDAS: ColunaVenda[] = [
  {
    key: "empresa",
    label: "Empresa",
    labelCurto: "Empresa",
    tipo: "texto",
    pesoPdf: 22,
    valor: (v) => v.cliente?.empresa ?? "",
  },
  {
    key: "matricula",
    label: "Matricula",
    labelCurto: "Mat.",
    tipo: "texto",
    pesoPdf: 11,
    valor: (v) => v.cliente?.matricula ?? "",
  },
  {
    key: "nome",
    label: "Nome",
    labelCurto: "Nome",
    tipo: "texto",
    pesoPdf: 21,
    valor: (v) => v.cliente?.nome ?? "N/D",
  },
  {
    key: "produtos",
    label: "Produtos",
    labelCurto: "Produtos",
    tipo: "texto",
    pesoPdf: 32,
    valor: (v) => produtosTexto(v),
  },
  {
    key: "qtd",
    label: "Qtd",
    labelCurto: "Qtd",
    tipo: "numero",
    pesoPdf: 8,
    valor: (v) => quantidadeTotal(v),
  },
  {
    key: "vendedor",
    label: "Vendedor",
    labelCurto: "Vendedor",
    tipo: "texto",
    pesoPdf: 22,
    valor: (v) => v.vendedor ?? "",
  },
  {
    key: "data",
    label: "Data",
    labelCurto: "Data",
    tipo: "data",
    pesoPdf: 17,
    valor: (v) => v.dataVenda,
  },
  {
    key: "valorTotal",
    label: "Valor",
    labelCurto: "Valor",
    tipo: "moeda",
    pesoPdf: 18,
    valor: (v) => valorTotalVenda(v),
  },
  {
    key: "parcelas",
    label: "Parcelas",
    labelCurto: "Parc.",
    tipo: "numero",
    pesoPdf: 8,
    sufixoPdf: "x",
    valor: (v) => v.parcelas ?? 1,
  },
  {
    key: "formaPagamento",
    label: "Pagamento",
    labelCurto: "Pagto.",
    tipo: "texto",
    pesoPdf: 23,
    valor: (v) => formaPagamentoLabel(resolverForma(v)),
    valorPdf: (v) => formaPagamentoLabelCurto(resolverForma(v)),
  },
  {
    key: "status",
    label: "Status",
    labelCurto: "Status",
    tipo: "texto",
    pesoPdf: 14,
    valor: (v) => v.status ?? "",
  },
  {
    key: "margemPct",
    label: "Margem %",
    labelCurto: "Margem",
    tipo: "percentual",
    pesoPdf: 14,
    valor: (v) => margemVenda(v),
  },
  {
    key: "margemConsignavel",
    label: "Margem consignavel",
    labelCurto: "M.consig.",
    tipo: "moeda",
    pesoPdf: 20,
    valor: (v) => (v.cliente?.renda != null ? v.cliente.renda * MARGEM_CONSIGNAVEL_FATOR : null),
  },
];

const CHAVES_VALIDAS = new Set<string>(COLUNAS_VENDAS.map((c) => c.key));

function isColunaKey(k: string): k is ColunaKey {
  return CHAVES_VALIDAS.has(k);
}

function colunasPorKeys(keys: readonly ColunaKey[]): ColunaVenda[] {
  const wanted = new Set<ColunaKey>(keys);
  return COLUNAS_VENDAS.filter((c) => wanted.has(c.key));
}

/** Conjunto padrao (D-03) — subsequencia da ordem canonica, reproduz o relatorio de hoje. */
export const COLUNAS_PADRAO: ColunaKey[] = [
  "matricula",
  "nome",
  "produtos",
  "vendedor",
  "data",
  "valorTotal",
  "parcelas",
  "formaPagamento",
];

/**
 * Resolve a lista de colunas a partir do parametro `colunas` da query string.
 *
 * Ausente, vazio, so espaco, ou sem nenhuma key valida cai no padrao (D-03).
 * Keys desconhecidas sao descartadas, duplicatas sao removidas, e o resultado
 * sempre sai na ordem canonica de `COLUNAS_VENDAS` — nunca na ordem digitada (D-04).
 */
export function resolverColunas(param: string | null | undefined): ColunaVenda[] {
  if (!param || !param.trim()) return colunasPorKeys(COLUNAS_PADRAO);

  const partes = param
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const validas = new Set<ColunaKey>();
  for (const p of partes) {
    if (isColunaKey(p)) validas.add(p);
  }

  if (validas.size === 0) return colunasPorKeys(COLUNAS_PADRAO);

  return COLUNAS_VENDAS.filter((c) => validas.has(c.key));
}

/** Colunas que expoem custo/renda — so devem sair para admin (T-QT-01). */
export const COLUNAS_SENSIVEIS: ColunaKey[] = ["margemPct", "margemConsignavel"];

/**
 * Remove as colunas sensiveis quando quem baixa nao e admin. O middleware
 * (`middleware.ts`) so autentica `/api/*`, nunca autoriza por perfil — sem
 * este filtro qualquer vendedor logado leria custo e renda pela query string.
 */
export function filtrarColunasPorPerfil(colunas: ColunaVenda[], ehAdmin: boolean): ColunaVenda[] {
  if (ehAdmin) return colunas;
  return colunas.filter((c) => !COLUNAS_SENSIVEIS.includes(c.key));
}

/**
 * Resolve as colunas da query string e aplica o filtro de perfil numa unica
 * chamada. Se a selecao ficar vazia depois do filtro — por exemplo um link
 * com `?colunas=margemPct,margemConsignavel` acessado por quem nao e admin —
 * cai no conjunto padrao em vez de devolver lista vazia: sem este fallback
 * `cabecalhoCsv`/`linhaCsv` produzem um CSV so de linhas em branco, e
 * `calcularLayoutPdf` produz uma tabela sem nenhuma coluna. O padrao nunca
 * contem coluna sensivel, entao o segundo filtro e um no-op de seguranca.
 */
export function resolverColunasParaExport(param: string | null | undefined, ehAdmin: boolean): ColunaVenda[] {
  const filtradas = filtrarColunasPorPerfil(resolverColunas(param), ehAdmin);
  if (filtradas.length > 0) return filtradas;
  return filtrarColunasPorPerfil(resolverColunas(null), ehAdmin);
}

/** Escapa uma celula em RFC 4180: aspas apenas quando necessario, dobrando as internas. */
function escaparCsv(valor: string): string {
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n") || valor.includes("\r")) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

function formatarValorCsv(tipo: TipoColuna, bruto: string | number | Date | null): string {
  if (bruto == null) return "";
  switch (tipo) {
    case "data": {
      const d = bruto instanceof Date ? bruto : new Date(bruto);
      return d.toISOString().slice(0, 10);
    }
    case "percentual":
      return (bruto as number).toFixed(1);
    case "moeda":
    case "numero":
      return String(bruto);
    case "texto":
    default:
      return String(bruto);
  }
}

/** Header do CSV — labels das colunas selecionadas, na ordem canonica. */
export function cabecalhoCsv(colunas: ColunaVenda[]): string {
  return colunas.map((c) => c.label).join(",");
}

/** Uma linha do CSV para a venda, com quoting RFC 4180 condicional por celula. */
export function linhaCsv(colunas: ColunaVenda[], venda: VendaRelatorio): string {
  return colunas.map((c) => escaparCsv(formatarValorCsv(c.tipo, c.valor(venda)))).join(",");
}

export interface FaixaPdf {
  coluna: ColunaVenda;
  x: number;
  largura: number;
}

/**
 * Calcula a posicao X e a largura de cada coluna a partir do `pesoPdf` das
 * colunas selecionadas. Substitui o array de posicoes literais que a rota do
 * PDF tinha antes — com colunas selecionaveis nao existe posicao fixa que sirva.
 */
export function calcularLayoutPdf(colunas: ColunaVenda[], xInicio: number, larguraUtil: number): FaixaPdf[] {
  const somaPesos = colunas.reduce((s, c) => s + c.pesoPdf, 0);
  let x = xInicio;
  return colunas.map((coluna) => {
    const largura = somaPesos > 0 ? (larguraUtil * coluna.pesoPdf) / somaPesos : 0;
    const faixa: FaixaPdf = { coluna, x, largura };
    x += largura;
    return faixa;
  });
}

/**
 * Devolve o maior prefixo de `texto` cuja medida (via `medir`, injetada para
 * nao depender do pdf-lib nos testes) cabe em `larguraMax`. Sem elipse, para
 * nao arriscar caractere fora do WinAnsi da Helvetica.
 */
export function truncarParaLargura(texto: string, larguraMax: number, medir: (t: string) => number): string {
  if (medir(texto) <= larguraMax) return texto;

  let lo = 0;
  let hi = texto.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (medir(texto.slice(0, mid)) <= larguraMax) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return texto.slice(0, lo);
}

/** Celula formatada para o PDF: usa `valorPdf` quando existir, senao `valor`. */
export function celulaPdf(coluna: ColunaVenda, venda: VendaRelatorio): string {
  const bruto = coluna.valorPdf ? coluna.valorPdf(venda) : coluna.valor(venda);
  if (bruto == null || bruto === "") return "—";

  switch (coluna.tipo) {
    case "data":
      return formatarDataPura(bruto as Date | string);
    case "moeda":
      return formatBRL(bruto as number);
    case "percentual":
      return `${(bruto as number).toFixed(1).replace(".", ",")}%`;
    case "numero":
      return `${bruto}${coluna.sufixoPdf ?? ""}`;
    case "texto":
    default:
      return String(bruto);
  }
}
