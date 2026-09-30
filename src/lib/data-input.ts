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
 * Converte "AAAA-MM-DD" em Date à meia-noite UTC, a mesma convenção de `new Date("AAAA-MM-DD")`
 * com que a venda grava `dataVenda`. Recusa outro formato e data que não existe no calendário
 * (2026-02-30), que `Date.UTC` rolaria em silêncio para o mês seguinte. Inválida vira undefined.
 */
export function parseDataIsoUtc(valor?: string | null): Date | undefined {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : undefined;
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

/**
 * O que o <DateInput> deve fazer com o que o calendario devolve no `onSelect`.
 *
 * `mode="single"` sem `required` faz toggle-off: tocar no dia JA selecionado devolve
 * `undefined` (react-day-picker, `selection/useSingle.js`). O que isso significa
 * depende do campo:
 *
 * - Campo obrigatorio (vencimento de parcela, data da venda): limpar nao e' operacao
 *   valida. Antes, num campo nao-controlado, o toque zerava a data e o hidden ia ""
 *   no submit — a action recusava com "Dados invalidos". Agora e' toque sem efeito.
 * - Campo opcional (data de nascimento do cliente): limpar E' valido, o backend grava
 *   null, e o toggle-off e' o unico gesto que a UI oferece para isso — o campo nao tem
 *   botao de limpar. Continua limpando.
 */
export function selecaoDeDataDoCalendario(params: {
  selecionada?: Date;
  obrigatorio?: boolean;
}): { novaData?: string; limpar: boolean } {
  if (params.selecionada) return { novaData: dataParaHidden(params.selecionada), limpar: false };
  return { novaData: undefined, limpar: !params.obrigatorio };
}
