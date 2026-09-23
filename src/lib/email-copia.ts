/**
 * E-mail em cópia por empresa parceira (`EmpresaParceira.emailCopia`): quem está
 * aqui recebe, em Cc, tudo o que vai ao RH — termo assinado, consolidado semanal
 * e relatório mensal. Gravado normalizado: minúsculas, sem repetidos, ", ".
 */
import { assertSafeEmailAddresses } from "@/lib/email-mime";

function separar(texto: string): string[] {
  return texto
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function valido(email: string): boolean {
  try {
    assertSafeEmailAddresses([email]);
    return true;
  } catch {
    return false;
  }
}

export type NormalizacaoEmailCopia = { ok: true; valor: string | null } | { ok: false; invalidos: string[] };

/** O que o admin digitou → valor para gravar, ou os endereços que não passam. */
export function normalizarEmailsCopia(texto: string): NormalizacaoEmailCopia {
  const emails = [...new Set(separar(texto))];
  const invalidos = emails.filter((e) => !valido(e));
  if (invalidos.length > 0) return { ok: false, invalidos };
  return { ok: true, valor: emails.length > 0 ? emails.join(", ") : null };
}

/** Valor gravado → lista de Cc, sem o próprio RH e sem endereço inválido. */
export function emailsCopia(valor: string | null | undefined, emailRh?: string | null): string[] {
  if (!valor) return [];
  const rh = emailRh?.trim().toLowerCase();
  return [...new Set(separar(valor))].filter((e) => e !== rh && valido(e));
}
