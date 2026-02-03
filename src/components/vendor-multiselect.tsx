"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function VendorMultiSelect({
  name,
  vendors,
  defaultSelected,
}: {
  name: string;
  vendors: string[];
  defaultSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const value = useMemo(() => selected.join(","), [selected]);

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
          <Button variant="outline" className="justify-between">
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
          {vendors.map((v) => (
            <DropdownMenuCheckboxItem
              key={v}
              checked={selected.includes(v)}
              onCheckedChange={() => toggle(v)}
            >
              {v}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
