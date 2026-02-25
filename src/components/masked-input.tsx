"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, formatCep } from "@/lib/masks";

type MaskType = "phone" | "cep";

function applyMask(value: string, mask: MaskType): string {
  if (mask === "phone") return formatPhone(value);
  if (mask === "cep") return formatCep(value);
  return value;
}

export interface MaskedInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange"> {
  mask: MaskType;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value: valueProp, defaultValue, onChange, ...props }, ref) => {
    const isControlled = valueProp !== undefined;
    const [internalValue, setInternalValue] = React.useState(() => {
      const v = defaultValue ?? valueProp ?? "";
      return v ? applyMask(v, mask) : "";
    });

    const displayValue = isControlled ? applyMask(valueProp ?? "", mask) : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      const formatted = applyMask(raw, mask);
      if (!isControlled) setInternalValue(formatted);
      const synthetic = { ...e, target: { ...e.target, value: formatted } };
      onChange?.(synthetic);
    };

    return (
      <Input
        ref={ref}
        {...props}
        value={displayValue}
        onChange={handleChange}
        placeholder={props.placeholder ?? (mask === "phone" ? "(00) 00000-0000" : "00000-000")}
        inputMode="numeric"
        autoComplete={mask === "phone" ? "tel" : "postal-code"}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };
