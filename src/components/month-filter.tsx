"use client";

import { useQueryState, parseAsString } from "nuqs";
import { FormSelect } from "@/components/form-select";
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
      <FormSelect
        name="mes"
        value={mes}
        onValueChange={(v) => setMes(v)}
        options={mesList}
        placeholder="Selecione o mês"
        searchPlaceholder="Pesquisar mês..."
        className="w-[180px]"
      />
    </div>
  );
}
