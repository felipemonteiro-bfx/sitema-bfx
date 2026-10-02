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
  const t = v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "") return null;
  if (t === "s" || t === "sim" || t === "1") return true;
  if (t === "n" || t === "nao" || t === "0") return false;
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

const MOTIVO_FRETE_SEM_CUSTO = "frete cobrado sem custo de envio";
const MOTIVO_ENTREGA_SEM_CUSTO = "entrega sem custo de envio";
const MOTIVO_RETIRADA_COM_FRETE = "retirada com frete cobrado";
const MOTIVO_ENTREGA_INVALIDA = "entrega deve ser S ou N";

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
