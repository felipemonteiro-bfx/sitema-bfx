import { z } from "zod";
import {
  erroCustoEnvio,
  erroEntrega,
  MSG_CUSTO_ENVIO_ENTREGA,
  MSG_RETIRADA_COM_FRETE,
} from "@/lib/validations/venda";

const toNum = (v: unknown): number => {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") return Number(String(v).replace(",", ".")) || 0;
  return 0;
};

const toDate = (v: unknown): Date => {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

/** Marca de uma celula de Entrega que nao e S nem N: a rota recusa o lote apontando a linha. */
export const ENTREGA_INVALIDA = "invalida" as const;
export type EntregaDaPlanilha = boolean | null | typeof ENTREGA_INVALIDA;

/**
 * Coluna "Entrega (S/N)": S, sim e 1 viram entrega; N, nao e 0 viram retirada; em branco
 * (ou coluna ausente) fica null, como as vendas anteriores a regra. Qualquer outra coisa e
 * invalida, para nunca virar entrega ou retirada por engano.
 */
export function lerEntregaDaPlanilha(v: unknown): EntregaDaPlanilha {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return ENTREGA_INVALIDA;
  // So a forma composta (NFC), para o "ã" decomposto do Excel do Mac casar; nenhuma marca e
  // removida, entao "S" com trema ou letra parecida continua invalida.
  const t = v.trim().toLowerCase().normalize("NFC");
  if (t === "") return null;
  if (t === "s" || t === "sim" || t === "1") return true;
  if (t === "n" || t === "nao" || t === "não" || t === "0") return false;
  return ENTREGA_INVALIDA;
}

/**
 * Schema para linha de importação em lote (CSV)
 * Aceita formato vindo do frontend (strings/numbers)
 */
export const importacaoRowSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório").transform((s) => s.trim()),
  produto: z.union([z.string(), z.number()]).optional().default("").transform(String),
  valor: z.unknown().transform((v) => toNum(v)).refine((n) => n >= 0, "Valor não pode ser negativo"),
  frete: z.unknown().optional().default(0).transform((v) => Math.max(0, toNum(v))),
  envio: z.unknown().optional().default(0).transform((v) => Math.max(0, toNum(v))),
  custo: z.unknown().optional().default(0).transform((v) => Math.max(0, toNum(v))),
  parcelas: z.unknown()
    .optional()
    .default(1)
    .transform((v) => Math.max(1, Math.min(60, Math.floor(toNum(v)) || 1))),
  dataVenda: z.unknown().transform((v) => toDate(v)).refine((d) => !isNaN(d.getTime()), "Data inválida"),
  vendedor: z.union([z.string(), z.number()]).optional().default("").transform(String),
  antecipada: z
    .union([z.boolean(), z.number(), z.string()])
    .optional()
    .transform((v) => Boolean(v && v !== "0" && v !== 0 && String(v).toLowerCase() !== "n")),
  temNota: z
    .union([z.boolean(), z.number(), z.string()])
    .optional()
    .transform((v) => Boolean(v && v !== "0" && v !== 0 && String(v).toLowerCase() !== "n" && String(v).toLowerCase() !== "false")),
  taxaNota: z.unknown().optional().default(5.97).transform((v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return isNaN(n) || n <= 0 ? 5.97 : n;
  }),
  entrega: z.unknown().optional().transform(lerEntregaDaPlanilha),
});

export const importacaoBatchSchema = z.array(importacaoRowSchema);

const toEmpresaId = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Payload do POST /api/importacao/batch.
 * Aceita o formato antigo (array puro de linhas) e o novo, com a empresa
 * parceira que deve ser aplicada aos clientes criados durante a importacao.
 */
export const importacaoPayloadSchema = z.union([
  z.array(importacaoRowSchema).transform((rows) => ({ empresaParceiraId: null, rows })),
  z.object({
    empresaParceiraId: z.unknown().optional().transform(toEmpresaId),
    rows: z.array(importacaoRowSchema),
  }),
]);

export type ImportacaoRow = z.infer<typeof importacaoRowSchema>;

export type LinhaInvalidaDeFrete = { linha: number; cliente: string; motivo: string };

export const MOTIVO_FRETE_SEM_CUSTO = "frete cobrado sem custo de envio";
export const MOTIVO_ENTREGA_SEM_CUSTO = "entrega sem custo de envio";
export const MOTIVO_RETIRADA_COM_FRETE = "retirada com frete cobrado";
export const MOTIVO_ENTREGA_INVALIDA = "entrega deve ser S ou N";

function motivoDaLinha(row: { frete: number; envio: number; entrega?: EntregaDaPlanilha }): string | null {
  const { entrega } = row;
  if (entrega === ENTREGA_INVALIDA) return MOTIVO_ENTREGA_INVALIDA;
  if (typeof entrega === "boolean") {
    const msg = erroEntrega({ entrega, frete: row.frete, envio: row.envio });
    if (msg === MSG_CUSTO_ENVIO_ENTREGA) return MOTIVO_ENTREGA_SEM_CUSTO;
    if (msg === MSG_RETIRADA_COM_FRETE) return MOTIVO_RETIRADA_COM_FRETE;
    return null;
  }
  // Entrega em branco: vale so o piso da regra do frete real (frete > 0 exige custo de envio).
  return erroCustoEnvio(row.frete, row.envio) ? MOTIVO_FRETE_SEM_CUSTO : null;
}

/**
 * Linhas da planilha que quebram a regra do frete real ou trazem Entrega invalida. A numeracao
 * e a posicao na lista enviada, a mesma da tabela de previa. Linha de cliente em branco e
 * ignorada porque a rota nao a grava, mas conta na numeracao.
 */
export function linhasInvalidasDeFrete(
  rows: { cliente: string; frete: number; envio: number; entrega?: EntregaDaPlanilha }[],
): LinhaInvalidaDeFrete[] {
  const linhas: LinhaInvalidaDeFrete[] = [];
  rows.forEach((row, i) => {
    const cliente = row.cliente.trim();
    if (!cliente) return;
    const motivo = motivoDaLinha(row);
    if (motivo) linhas.push({ linha: i + 1, cliente, motivo });
  });
  return linhas;
}

const MAX_LINHAS_NA_MENSAGEM = 10;

export function mensagemLinhasInvalidasDeFrete(linhas: LinhaInvalidaDeFrete[]): string {
  const visiveis = linhas.slice(0, MAX_LINHAS_NA_MENSAGEM).map((l) => `linha ${l.linha} (${l.cliente}): ${l.motivo}`);
  const resto = linhas.length - visiveis.length;
  const lista = visiveis.join("; ") + (resto > 0 ? `; e mais ${resto}` : "");
  const quantas = linhas.length === 1 ? "1 linha" : `${linhas.length} linhas`;
  return `${quantas} com problema de frete ou entrega: ${lista}. Nada foi importado. Corrija a planilha e envie de novo.`;
}

/**
 * A checagem da tela de previa: recebe as celulas como o operador as ve (strings) e as le como
 * o schema do servidor (virgula decimal, nao numerico = 0, piso em 0), para tela e rota nunca
 * divergirem.
 */
export function linhasInvalidasDaPrevia(
  rows: { cliente: string; frete: unknown; envio: unknown; entrega: unknown }[],
): LinhaInvalidaDeFrete[] {
  return linhasInvalidasDeFrete(
    rows.map((r) => ({
      cliente: r.cliente,
      frete: Math.max(0, toNum(r.frete)),
      envio: Math.max(0, toNum(r.envio)),
      entrega: lerEntregaDaPlanilha(r.entrega),
    })),
  );
}

/** Aviso do topo da previa: quantas linhas faltam corrigir e quais (ate 10). */
export function mensagemAvisoDaPrevia(linhas: LinhaInvalidaDeFrete[]): string {
  const nomes = linhas.slice(0, MAX_LINHAS_NA_MENSAGEM).map((l) => `linha ${l.linha}`);
  const resto = linhas.length - nomes.length;
  let lista: string;
  if (resto > 0) lista = `${nomes.join(", ")} e mais ${resto}`;
  else if (nomes.length > 1) lista = `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  else lista = nomes[0] ?? "";
  const quantas = linhas.length === 1 ? "1 linha precisa" : `${linhas.length} linhas precisam`;
  return `${quantas} de correção antes de subir: ${lista}.`;
}

/** Celulas que o operador deve corrigir em cada motivo (para destacar na previa). */
export function camposDestacados(motivo: string): ("frete" | "envio" | "entrega")[] {
  if (motivo === MOTIVO_FRETE_SEM_CUSTO || motivo === MOTIVO_ENTREGA_SEM_CUSTO) return ["envio"];
  if (motivo === MOTIVO_RETIRADA_COM_FRETE) return ["frete", "entrega"];
  if (motivo === MOTIVO_ENTREGA_INVALIDA) return ["entrega"];
  return [];
}

/**
 * Deixa as celulas da previa mostrando o que o servidor vai ler: virgula decimal vira ponto (o
 * campo numerico descarta "30,5") e uma Entrega valida vira S, N ou vazio (o select so conhece
 * essas opcoes). Entrega invalida segue como veio, para a linha apontar o problema.
 */
export function normalizarCelulasDaPrevia<T extends { frete: string; envio: string; entrega: string }>(row: T): T {
  const entrega = lerEntregaDaPlanilha(row.entrega);
  return {
    ...row,
    frete: String(row.frete ?? "").replace(",", "."),
    envio: String(row.envio ?? "").replace(",", "."),
    entrega: entrega === true ? "S" : entrega === false ? "N" : entrega === null ? "" : row.entrega,
  };
}
