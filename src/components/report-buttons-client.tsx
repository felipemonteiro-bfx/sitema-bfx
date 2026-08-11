"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText } from "lucide-react";
import { COLUNAS_VENDAS, COLUNAS_PADRAO, type ColunaKey } from "@/lib/relatorio-vendas-colunas";

type Props = {
  empresaOptions: string[];
  defaultFrom: string;
  defaultTo: string;
};

export function ReportButtonsClient({ empresaOptions, defaultFrom, defaultTo }: Props) {
  const [empresa, setEmpresa] = React.useState<string>("all");
  const [from, setFrom] = React.useState<string>(defaultFrom);
  const [to, setTo] = React.useState<string>(defaultTo);
  const [colunas, setColunas] = React.useState<ColunaKey[]>(COLUNAS_PADRAO);

  const toggleColuna = (key: ColunaKey, marcado: boolean) => {
    setColunas((atual) => (marcado ? [...atual, key] : atual.filter((k) => k !== key)));
  };

  const buildUrl = (endpoint: string) => {
    const params = new URLSearchParams();
    if (empresa) params.set("empresa", empresa);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (colunas.length > 0) params.set("colunas", colunas.join(","));
    return `${endpoint}?${params.toString()}`;
  };

  const handleDownload = (type: "csv" | "pdf") => {
    const endpoint = type === "csv" ? "/api/relatorios/vendas" : "/api/relatorios/vendas/pdf";
    window.location.assign(buildUrl(endpoint));
  };

  const semColunas = colunas.length === 0;

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
        <div className="space-y-1">
          <Label htmlFor="rel-colunas-trigger">Colunas</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="rel-colunas-trigger"
                type="button"
                variant="outline"
                className="w-full justify-start"
              >
                Colunas ({colunas.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <div className="flex gap-2 border-b pb-2 mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColunas(COLUNAS_VENDAS.map((c) => c.key))}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColunas(COLUNAS_PADRAO)}
                >
                  Padrão
                </Button>
              </div>
              <ScrollArea className="h-64 pr-3">
                <div className="space-y-2">
                  {COLUNAS_VENDAS.map((coluna) => {
                    const marcado = colunas.includes(coluna.key);
                    const inputId = `rel-coluna-${coluna.key}`;
                    return (
                      <div key={coluna.key} className="flex items-center gap-2">
                        <Checkbox
                          id={inputId}
                          checked={marcado}
                          onCheckedChange={(checked) => toggleColuna(coluna.key, checked === true)}
                        />
                        <Label htmlFor={inputId} className="cursor-pointer text-sm font-normal">
                          {coluna.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {semColunas && (
        <p className="text-xs text-muted-foreground">
          Escolha ao menos uma coluna para baixar o relatório.
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={() => handleDownload("csv")}
          leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          disabled={semColunas}
        >
          Baixar CSV (Excel)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleDownload("pdf")}
          leftIcon={<FileText className="h-4 w-4" />}
          disabled={semColunas}
        >
          Baixar PDF (Impressão)
        </Button>
      </div>
    </div>
  );
}
