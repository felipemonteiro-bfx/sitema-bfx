"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = {
  label: string;
  value: string;
};

type FormSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export function FormSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Selecione",
  className,
}: FormSelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className={className ?? "h-10"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
