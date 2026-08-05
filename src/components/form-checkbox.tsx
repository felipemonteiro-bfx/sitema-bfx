"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { VALOR_CHECKBOX_LIGADO } from "@/lib/form-values";

/**
 * `<Checkbox>` do shadcn que participa de formulario NATIVO.
 *
 * O componente do Radix e um `<button role="checkbox">`: ele nao entra no
 * `FormData` de um `<form action={serverAction}>`. Trocar um
 * `<input type="checkbox" name="x">` por ele sem mais nada faz o campo sumir
 * do envio — e como os Server Actions leem `formData.get("x")`, a opcao passa
 * a salvar DESMARCADA para sempre, em silencio.
 *
 * A solucao e a mesma que o `<FormSelect>` ja usa: o controle do Radix cuida
 * do visual e do teclado, e um `<input type="hidden">` ao lado carrega o valor
 * de verdade. Marcado envia `"on"` (igual ao nativo); desmarcado envia `""` —
 * diferenca sutil e proposital em relacao ao nativo, que nao envia nada:
 * `checkboxLigado()` trata os dois casos como desligado, entao o Server Action
 * nao precisa saber qual dos dois chegou.
 *
 * Para checkbox que NAO vive em formulario nativo (estado React enviado por
 * fetch/JSON), use o `<Checkbox>` direto — aqui o campo oculto seria um campo
 * sem dono.
 */
export interface FormCheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof Checkbox>,
    "checked" | "defaultChecked" | "onCheckedChange" | "name"
  > {
  /** `name` do campo no `FormData` — vai para o input oculto, nao para o Radix. */
  name: string;
  defaultChecked?: boolean;
  /** Associa o campo oculto a um `<form>` por id, quando ele fica fora da arvore. */
  form?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const FormCheckbox = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  FormCheckboxProps
>(({ name, defaultChecked = false, form, onCheckedChange, id, ...props }, ref) => {
  const [checked, setChecked] = React.useState(defaultChecked);

  return (
    <>
      <Checkbox
        ref={ref}
        id={id ?? name}
        checked={checked}
        onCheckedChange={(valor) => {
          // `valor` e `true | false | "indeterminate"`. Normalizar aqui evita
          // que a string chegue ao estado — e `"indeterminate"` e truthy, o
          // que deixaria o campo marcado para sempre.
          const ligado = valor === true;
          setChecked(ligado);
          onCheckedChange?.(ligado);
        }}
        {...props}
      />
      <input
        type="hidden"
        name={name}
        value={checked ? VALOR_CHECKBOX_LIGADO : ""}
        form={form}
      />
    </>
  );
});
FormCheckbox.displayName = "FormCheckbox";

export { FormCheckbox };
