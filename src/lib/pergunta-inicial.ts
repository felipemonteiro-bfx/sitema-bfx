/** Tamanho máximo da pergunta vinda pela URL (`/inteligencia?pergunta=`). */
export const PERGUNTA_INICIAL_MAX = 500;

/**
 * Texto pré-preenchido no chat a partir do query param `pergunta`.
 * Só pré-preenche: quem envia é o usuário. Param repetido usa o primeiro valor;
 * vazio ou só espaços vira "" e o campo abre limpo.
 */
export function perguntaInicial(valor: string | string[] | undefined): string {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof bruto !== "string") return "";
  return bruto.trim().slice(0, PERGUNTA_INICIAL_MAX);
}
