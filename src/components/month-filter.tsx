"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryParam } from "@/lib/use-query-param";

export function MonthFilter() {
  const [mes, setMes] = useQueryParam("mes", format(new Date(), "yyyy-MM"));

  const mesList = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: ptBR }),
    };
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{"Per\u00EDodo:"}</span>
      <Select value={mes} onValueChange={(v) => setMes(v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={"Selecione o m\u00EAs"} />
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
