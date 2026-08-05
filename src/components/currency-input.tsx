"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyBR, parseCurrencyBR, valorInicialMoeda } from "@/lib/masks";

export interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> {
  value?: number | string;
  defaultValue?: number | string;
  onChange?: (value: number) => void;
}


const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value: valueProp, defaultValue, onChange, name, ...props }, ref) => {
    const isControlled = valueProp !== undefined;
    const initialNum = valorInicialMoeda(defaultValue ?? valueProp);
    const [internalValue, setInternalValue] = React.useState(initialNum);
    // Durante edição, armazena o texto bruto digitado pelo usuário (evita cursor pulando)
    const [editingValue, setEditingValue] = React.useState<string | null>(null);
    const isEditing = editingValue !== null;

    const currentNum = isControlled
      ? valorInicialMoeda(valueProp)
      : internalValue;

    const rawValue = currentNum;

    // Exibe o texto bruto durante edição; formatado quando não está em foco
    const displayValue = isEditing ? editingValue : formatCurrencyBR(currentNum);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setEditingValue(raw);
      const parsed = parseCurrencyBR(raw);
      if (!isControlled) setInternalValue(parsed);
      onChange?.(parsed);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Converte para string simples para facilitar a digitação (ex: "1500,00")
      setEditingValue(currentNum > 0 ? currentNum.toFixed(2).replace(".", ",") : "");
      // Não usar select() - permite editar posição específica sem substituir tudo
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parseCurrencyBR(editingValue ?? "");
      if (!isControlled) setInternalValue(parsed);
      onChange?.(parsed);
      setEditingValue(null);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 inline-flex h-4 min-w-5 -translate-y-1/2 items-center justify-start text-sm font-medium text-muted-foreground">
          R$
        </span>
        <input
          type="hidden"
          name={name}
          value={rawValue}
          readOnly
        />
        <Input
          ref={ref}
          {...props}
          name={undefined}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={props.placeholder ?? "0,00"}
          className={(props.className ?? "") + " pl-10"}
          inputMode="decimal"
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
