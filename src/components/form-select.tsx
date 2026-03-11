"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  searchable?: boolean;
  searchPlaceholder?: string;
  formId?: string;
};

export function FormSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Selecione",
  className,
  searchable = true,
  searchPlaceholder = "Pesquisar...",
  formId,
}: FormSelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filtered = React.useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="min-h-10 overflow-hidden">
      <input type="hidden" name={name} value={value} form={formId} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "min-h-10 h-auto py-2 w-full justify-between gap-2 overflow-hidden box-border text-left font-normal [&_svg]:flex-shrink-0 touch-manipulation",
              "sm:max-h-10 sm:py-0 sm:min-h-0 sm:h-10",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2.5">
          {searchable && (
            <div className="mb-2 flex items-center gap-2 border-b border-border/60 pb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-7 border-0 bg-transparent p-0 text-sm shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )}
          <div className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain pr-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      opt.value === value && "bg-muted"
                    )}
                    onClick={() => handleValueChange(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && <Check className="h-4 w-4 opacity-80" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
