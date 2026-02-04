"use client";

import { useQueryState, parseAsString } from "nuqs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MonthFilter() {
  const [mes, setMes] = useQueryState(
    "mes",
    parseAsString.withDefault(format(new Date(), "yyyy-MM")).withOptions({ shallow: false })
  );

  const mesList = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: ptBR }),
    };
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Período:</span>
      <Select value={mes} onValueChange={(v) => setMes(v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o mês" />
        </SelectTrigger>
        <SelectContent>
          {mesList.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              <span className="capitalize">{m.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
