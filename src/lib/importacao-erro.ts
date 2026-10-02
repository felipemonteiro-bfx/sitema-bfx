/** Mensagem de erro que o servidor devolveu no corpo JSON, ou null se nao houver texto legivel. */
export function lerErroDoCorpo(corpo: unknown): string | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const erro = (corpo as { error?: unknown }).error;
  return typeof erro === "string" && erro.trim() ? erro : null;
}
