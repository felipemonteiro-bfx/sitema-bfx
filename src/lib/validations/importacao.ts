import { z } from "zod";
import { erroCustoEnvio } from "@/lib/validations/venda";

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

export type LinhaSemCustoEnvio = { linha: number; cliente: string };

/**
 * Linhas da planilha com frete cobrado e sem custo real de envio (a regra do frete real).
 * A numeracao e a posicao na lista enviada, a mesma da tabela de previa. Linha de cliente
 * em branco e ignorada porque a rota nao a grava, mas conta na numeracao.
 */
export function linhasSemCustoDeEnvio(
  rows: { cliente: string; frete: number; envio: number }[],
): LinhaSemCustoEnvio[] {
  const linhas: LinhaSemCustoEnvio[] = [];
  rows.forEach((row, i) => {
    const cliente = row.cliente.trim();
    if (!cliente) return;
    if (erroCustoEnvio(row.frete, row.envio)) linhas.push({ linha: i + 1, cliente });
  });
  return linhas;
}

const MAX_LINHAS_NA_MENSAGEM = 10;

export function mensagemLinhasSemCustoDeEnvio(linhas: LinhaSemCustoEnvio[]): string {
  const visiveis = linhas.slice(0, MAX_LINHAS_NA_MENSAGEM).map((l) => `linha ${l.linha} (${l.cliente})`);
  const resto = linhas.length - visiveis.length;
  const lista = visiveis.join(", ") + (resto > 0 ? ` e mais ${resto}` : "");
  const quantas = linhas.length === 1 ? "1 linha" : `${linhas.length} linhas`;
  return `${quantas} com frete cobrado e sem custo de envio: ${lista}. Nada foi importado. Corrija a planilha e envie de novo.`;
}
