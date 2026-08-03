"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { FileSpreadsheet, FileText } from "lucide-react";

type Props = {
  empresaOptions: string[];
  defaultFrom: string;
  defaultTo: string;
};

export function ReportButtonsClient({ empresaOptions, defaultFrom, defaultTo }: Props) {
  const [empresa, setEmpresa] = React.useState<string>("all");
  const [from, setFrom] = React.useState<string>(defaultFrom);
  const [to, setTo] = React.useState<string>(defaultTo);

  const buildUrl = (endpoint: string) => {
    const params = new URLSearchParams();
    if (empresa) params.set("empresa", empresa);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `${endpoint}?${params.toString()}`;
  };

  const handleDownload = (type: "csv" | "pdf") => {
    const endpoint = type === "csv" ? "/api/relatorios/vendas" : "/api/relatorios/vendas/pdf";
    window.location.assign(buildUrl(endpoint));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="rel-empresa">Empresa Parceira</Label>
          <FormSelect
            id="rel-empresa"
            name="empresa"
            value={empresa}
            onValueChange={setEmpresa}
            options={[
              { value: "all", label: "Todas" },
              ...empresaOptions.map((nome) => ({ value: nome, label: nome })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rel-from">Data inicial</Label>
          <DateInput id="rel-from" name="from" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rel-to">Data final</Label>
          <DateInput id="rel-to" name="to" value={to} onChange={setTo} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={() => handleDownload("csv")}
          leftIcon={<FileSpreadsheet className="h-4 w-4" />}
        >
          Baixar CSV (Excel)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleDownload("pdf")}
          leftIcon={<FileText className="h-4 w-4" />}
        >
          Baixar PDF (Impressão)
        </Button>
      </div>
    </div>
  );
}
