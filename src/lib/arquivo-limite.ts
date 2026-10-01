/**
 * Limite dos arquivos do financeiro, sem dependência de Node: o servidor (`arquivo-financeiro`)
 * e a tela usam o mesmo número. A tela confere antes de enviar porque o Next recusa o corpo da
 * server action acima de 10 MB (`next.config.ts`) antes de ela rodar — a mensagem da action
 * nunca chegaria.
 */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

/** Mensagem do primeiro arquivo do formulário que passa do limite, ou null. */
export function arquivoGrandeDemais(fd: FormData): string | null {
  for (const [, valor] of fd.entries()) {
    if (typeof valor !== "string" && valor.size > TAMANHO_MAXIMO_ARQUIVO) {
      return `O arquivo ${valor.name} passa de 10 MB.`;
    }
  }
  return null;
}
