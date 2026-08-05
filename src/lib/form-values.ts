/**
 * Leitura de campos booleanos vindos de `FormData`.
 *
 * Contexto que custou uma volta inteira: o `<Checkbox>` do Radix **participa**
 * de formulario nativo. O `Root` renderiza, alem do `<button role="checkbox">`,
 * um `CheckboxBubbleInput` — um `<input type="checkbox" aria-hidden name value
 * form required disabled>` de verdade — sempre que estiver dentro de um
 * `<form>` (`isFormControl`), e o `value` tem default `"on"`. Ou seja,
 * `<Checkbox name="x" defaultChecked={...} />` envia exatamente o que o input
 * nativo enviava: `"on"` marcado, **nada** desmarcado.
 * (Verificado no fonte de `@radix-ui/react-checkbox@1.3.3`, a versao travada no
 * lockfile; e ja havia prova viva em `edit-venda-historico-form.tsx`, que usa
 * `<Checkbox name="temNota">` em producao desde antes.)
 *
 * Entao por que este modulo existe? Porque a leitura estava espalhada em duas
 * convencoes diferentes para os MESMOS campos:
 *
 *   `=== "on"`    /configuracoes e /historico (checkbox de formulario)
 *   `=== "true"`  /venda-rapida — o FormData e montado a mao com `String(bool)`
 *
 * `temNota`, `descontoEmFolha` e `boleto` sao lidos pelos DOIS caminhos. Quem
 * mover um checkbox de uma tela para a outra recebe `"on"` onde o leitor
 * compara com `"true"` — e grava `false` em silencio, sem erro e sem toast.
 * Centralizar aqui faz as duas convencoes convergirem.
 *
 * Mora em `lib/` e nao no componente porque o vitest roda em
 * `environment: node` e so inclui `src/__tests__/**\/*.test.ts`: componente
 * React nao e testavel, logica pura e.
 */

/**
 * Valor que um checkbox marcado envia — `"on"`, o default do `value` tanto do
 * `<input type="checkbox">` nativo quanto do `<Checkbox>` do Radix.
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
 * Ausente (`null`) e vazio contam como DESLIGADO: o primeiro e o checkbox
 * desmarcado (que nao envia nada), o segundo cobre quem monta o `FormData` a
 * mao. `"false"`/`"0"`/`"off"` idem — a venda rapida envia `String(boolean)`, e
 * sem esse cuidado `"false"` (string nao-vazia) seria truthy.
 */
export function checkboxLigado(valor: FormDataEntryValue | null | undefined): boolean {
  if (typeof valor !== "string") return false;
  return LIGADO.has(valor.trim().toLowerCase());
}

/** Atalho para os call sites que gravam `0`/`1` em coluna numerica. */
export function checkboxComoNumero(valor: FormDataEntryValue | null | undefined): 0 | 1 {
  return checkboxLigado(valor) ? 1 : 0;
}
