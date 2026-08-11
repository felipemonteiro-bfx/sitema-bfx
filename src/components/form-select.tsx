"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
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
  id?: string;
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
  id,
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

  // O wrapper nao impoe mais altura minima propria: o gatilho ja e `h-10`,
  // entao a altura minima era redundante no caso comum e nociva quando o call
  // site reduz a altura (`h-7`/`h-9`) — o bloco continuava com 40px, o gatilho
  // encostava no topo e a base ficava 10px acima da do botao irmao ao lado
  // (achado 5 da fase 17).
  return (
    <div className="overflow-hidden">
      <input type="hidden" name={name} value={value} form={formId} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            id={id}
            className={cn(
              // Sem sombra (D-03): trigger tem border-2 propria e vive no
              // mesmo plano do card/formulario — nao e um plano acima.
              "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-lg border-2 border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-accent/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card dark:border-input",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="line-clamp-1">{selected?.label ?? placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-xl border bg-popover p-2">
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
          <div className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-2.5 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                      opt.value === value && "bg-accent/50"
                    )}
                    onClick={() => handleValueChange(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && (
                      <span className="absolute right-2 inline-flex h-4 w-4 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
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
