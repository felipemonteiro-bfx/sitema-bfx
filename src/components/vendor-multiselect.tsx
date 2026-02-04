"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function VendorMultiSelect({
  id,
  name,
  vendors,
  defaultSelected,
  className,
}: {
  id?: string;
  name: string;
  vendors: string[];
  defaultSelected: string[];
  className?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [query, setQuery] = useState("");
  const value = useMemo(() => selected.join(","), [selected]);
  const filtered = useMemo(() => {
    if (!query.trim()) return vendors;
    const q = query.trim().toLowerCase();
    return vendors.filter((v) => v.toLowerCase().includes(q));
  }, [query, vendors]);

  function toggle(v: string) {
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function selectAll() {
    setSelected(vendors);
  }

  function clearAll() {
    setSelected([]);
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={["h-10 w-full justify-between", className].filter(Boolean).join(" ")}
          >
            Vendedores
            <span className="ml-2 text-xs text-muted-foreground">
              {selected.length}/{vendors.length}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Vendedores</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex gap-2 px-2 pb-2">
            <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
              Todos
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Limpar
            </Button>
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 pb-2">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar vendedor..."
                className="h-8 border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2 pr-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
            ) : (
              filtered.map((v) => (
                <DropdownMenuCheckboxItem
                  key={v}
                  checked={selected.includes(v)}
                  onCheckedChange={() => toggle(v)}
                >
                  {v}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
