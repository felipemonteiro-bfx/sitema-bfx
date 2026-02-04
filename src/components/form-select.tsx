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
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchEndpoint?: string;
  minQueryLength?: number;
};

export function FormSelect({
  name,
  options,
  defaultValue,
  placeholder = "Selecione",
  className,
  searchable = true,
  searchPlaceholder = "Pesquisar...",
  searchEndpoint,
  minQueryLength = 1,
}: FormSelectProps) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [remoteOptions, setRemoteOptions] = React.useState<Option[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const selected = React.useMemo(
    () => (remoteOptions ?? options).find((opt) => opt.value === value),
    [options, remoteOptions, value],
  );

  const filtered = React.useMemo(() => {
    if (searchEndpoint) return remoteOptions ?? options;
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, remoteOptions, searchEndpoint, searchable]);

  React.useEffect(() => {
    if (!searchEndpoint || !searchable || !open) return;
    const q = query.trim();
    if (q.length < minQueryLength) {
      setRemoteOptions(null);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const url = new URL(searchEndpoint, window.location.origin);
        url.searchParams.set("q", q);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to search");
        const data = (await res.json()) as { options?: Option[] };
        setRemoteOptions(Array.isArray(data.options) ? data.options : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRemoteOptions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [searchEndpoint, searchable, open, query, minQueryLength]);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full justify-between gap-2 text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
          {searchable && (
            <div className="mb-2 flex items-center gap-2 rounded-md border px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 border-0 p-0 focus-visible:ring-0"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Buscando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
            ) : (
              <div className="space-y-1">
                {filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted",
                      opt.value === value && "bg-muted",
                    )}
                    onClick={() => {
                      setValue(opt.value);
                      setOpen(false);
                      setQuery("");
                      setRemoteOptions(null);
                    }}
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
