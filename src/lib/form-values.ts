/**
 * Leitura de campos de formulario que nao tem representacao nativa.
 *
 * O `<Checkbox>` do Radix e um `<button role="checkbox">` — ele NAO participa
 * de `FormData`. Um `<input type="checkbox" name="x">` nativo envia `"on"`
 * quando marcado e simplesmente NAO APARECE no `FormData` quando desmarcado, e
 * e por isso que `formData.get("x") === "on"` funcionava.
 *
 * Trocar o nativo pelo componente sem repor um campo que envie valor faz o
 * campo sumir do `FormData` para sempre: `=== "on"` vira `false`, a
 * configuracao passa a gravar 0 e nada acusa — sem erro, sem toast, so o dado
 * errado. O `<FormCheckbox>` repoe o campo (um `<input type="hidden">`, mesma
 * solucao do `<FormSelect>`) e este modulo centraliza a leitura.
 *
 * Existe separado do componente de proposito: o vitest roda em
 * `environment: node` e so inclui `src/__tests__/**\/*.test.ts`, entao
 * componente React nao e testavel. A regra que importa — como ausencia, `"on"`
 * e variantes viram booleano — mora aqui, onde da para testar.
 */

/**
 * Valor emitido pelo campo oculto do `<FormCheckbox>` quando marcado.
 *
 * Deliberadamente `"on"`, o mesmo do checkbox nativo: assim um Server Action
 * que ainda nao tenha migrado para `checkboxLigado()` continua lendo certo, e
 * a migracao nao precisa ser atomica entre JSX e action.
 */
export const VALOR_CHECKBOX_LIGADO = "on";

const LIGADO = new Set(["on", "true", "1", "yes", "checked"]);

/**
 * Interpreta o valor de um checkbox vindo de `FormData`.
 *
 * `FormData.get()` devolve `FormDataEntryValue | null` — string OU `File`. Um
 * `File` nunca conta como ligado: sem este cuidado, um `Boolean(valor)` daria
 * `true` para qualquer upload que caisse no mesmo `name`.
 *
 * Ausente (`null`/`undefined`) e vazio contam como DESLIGADO — respectivamente
 * o checkbox nativo desmarcado (que nao envia nada) e o campo oculto
 * desmarcado (que envia `""`).
 */
export function checkboxLigado(valor: FormDataEntryValue | null | undefined): boolean {
  if (typeof valor !== "string") return false;
  return LIGADO.has(valor.trim().toLowerCase());
}

/** Atalho para os call sites que gravam `0`/`1` em coluna numerica. */
export function checkboxComoNumero(valor: FormDataEntryValue | null | undefined): 0 | 1 {
  return checkboxLigado(valor) ? 1 : 0;
}
