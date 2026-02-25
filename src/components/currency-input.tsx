"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyBR, parseCurrencyBR } from "@/lib/masks";

export interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> {
  value?: number | string;
  defaultValue?: number | string;
  onChange?: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value: valueProp, defaultValue, onChange, name, ...props }, ref) => {
    const isControlled = valueProp !== undefined;
    const initialNum = parseCurrencyBR(String(defaultValue ?? valueProp ?? ""));
    const [internalValue, setInternalValue] = React.useState(initialNum);

    const displayValue = isControlled
      ? formatCurrencyBR(typeof valueProp === "number" ? valueProp : parseCurrencyBR(String(valueProp ?? "")))
      : formatCurrencyBR(internalValue);

    const rawValue = isControlled
      ? (typeof valueProp === "number" ? valueProp : parseCurrencyBR(String(valueProp ?? "")))
      : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseCurrencyBR(e.target.value);
      if (!isControlled) setInternalValue(parsed);
      onChange?.(parsed);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      props.onFocus?.(e);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
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
