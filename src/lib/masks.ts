/**
 * Funções de máscara para formatação de inputs.
 * Mantém apenas dígitos no valor; formata para exibição.
 */

/** Formata telefone BR: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formata CEP BR: XXXXX-XXX */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Formata valor em R$ (BR): 1.550,00 */
export function formatCurrencyBR(value: string | number): string {
  const num = typeof value === "string" ? parseCurrencyBR(value) : value;
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string BR (1.550,00) ou número para número */
export function parseCurrencyBR(value: string | number): number {
  if (typeof value === "number") return value;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}
