/**
 * Regras de data do <DateInput>, isoladas do React para poderem ser testadas.
 *
 * O vitest deste projeto roda em `environment: "node"` e so inclui
 * `src/__tests__/**\/*.test.ts` — nao ha jsdom nem testing-library, entao
 * componente nao e' testavel aqui. A logica que quebrou fica neste modulo puro.
 */

/** Converte "2026-06-19" em Date local. Entrada vazia ou invalida vira undefined. */
export function parseDataISO(valor?: string | null): Date | undefined {
  if (!valor) return undefined;
  const data = new Date(valor + "T00:00:00");
  return Number.isNaN(data.getTime()) ? undefined : data;
}

/**
 * Qual data o campo deve exibir agora.
 *
 * O bug que isto corrige: o <DateInput> guardava a data em useState com
 * inicializador — que so roda na montagem — e ignorava mudancas de `value`
 * depois disso. O formulario de produto monta com dataCompra vazia e preenche
 * num useEffect, entao o campo continuava em "Selecionar data" mesmo com o
 * produto tendo data. Como o hidden espelha o campo, salvar sem tocar em nada
 * enviava "" e APAGAVA a data da compra no banco.
 *
 * Controlado (`value` definido) manda sempre: a fonte da verdade e' o pai, nao
 * um estado interno congelado no primeiro render.
 */
export function dataExibidaDoInput(params: {
  controlado: boolean;
  value?: string | null;
  interno?: Date;
}): Date | undefined {
  return params.controlado ? parseDataISO(params.value) : params.interno;
}

/** Formata para o `value` do input hidden. Sem data, string vazia. */
export function dataParaHidden(data: Date | undefined): string {
  if (!data) return "";
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
