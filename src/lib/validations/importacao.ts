import { z } from "zod";

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
