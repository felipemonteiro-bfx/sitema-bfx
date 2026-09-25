"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODOS_BOLETOS, ROTULO_PERIODO_BOLETOS, type FiltroBoletos, type PeriodoBoletos } from "@/lib/boletos-filtro";

interface Props {
  tab: string;
  filtro: FiltroBoletos;
  empresas: string[];
  /** "01/09 a 30/09" — o intervalo que o período escolhido cobre, para o botão. */
  resumoPeriodo: string;
}

const TODAS = "todas";

/** Período (estilo Asaas), empresa e busca da tela de Boletos. Tudo vai para a URL. */
export function BoletosFiltros({ tab, filtro, empresas, resumoPeriodo }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoBoletos>(filtro.periodo);
  const [de, setDe] = useState(filtro.de ?? "");
  const [ate, setAte] = useState(filtro.ate ?? "");
  const [busca, setBusca] = useState(filtro.q);

  const ir = (mudancas: Partial<Record<"periodo" | "de" | "ate" | "empresa" | "q", string | undefined>>) => {
    const atual = { periodo: filtro.periodo, de: filtro.de, ate: filtro.ate, empresa: filtro.empresa, q: filtro.q || undefined, ...mudancas };
    const params = new URLSearchParams({ tab });
    for (const [k, v] of Object.entries(atual)) if (v) params.set(k, v);
    if (atual.periodo !== "pers") {
      params.delete("de");
      params.delete("ate");
    }
    router.push(`/boletos?${params.toString()}`);
  };

  const aplicar = () => {
    setAberto(false);
    ir({ periodo, de: periodo === "pers" ? de || undefined : undefined, ate: periodo === "pers" ? ate || undefined : undefined });
  };

  const limpar = () => {
    setPeriodo("mes");
    setDe("");
    setAte("");
    setAberto(false);
    ir({ periodo: "mes", de: undefined, ate: undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover
        open={aberto}
        onOpenChange={(abrir) => {
          // Reabre sempre com o que está aplicado (a URL), não com a escolha abandonada.
          if (abrir) {
            setPeriodo(filtro.periodo);
            setDe(filtro.de ?? "");
            setAte(filtro.ate ?? "");
          }
          setAberto(abrir);
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="gap-2" aria-label={`Período: ${ROTULO_PERIODO_BOLETOS[filtro.periodo]}, ${resumoPeriodo}`}>
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {ROTULO_PERIODO_BOLETOS[filtro.periodo]}
            <span className="hidden text-muted-foreground sm:inline">· {resumoPeriodo}</span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          <RadioGroup value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoBoletos)} aria-label="Período" className="gap-1">
            {PERIODOS_BOLETOS.map((p) => (
              <Label key={p} htmlFor={`periodo-${p}`} className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-muted">
                <RadioGroupItem id={`periodo-${p}`} value={p} />
                {ROTULO_PERIODO_BOLETOS[p]}
              </Label>
            ))}
          </RadioGroup>
          {periodo === "pers" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="periodo-de" className="text-xs text-muted-foreground">De</Label>
                <DateInput id="periodo-de" value={de} onChange={setDe} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="periodo-ate" className="text-xs text-muted-foreground">Até</Label>
                <DateInput id="periodo-ate" value={ate} onChange={setAte} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={limpar}>Limpar</Button>
            <Button type="button" size="sm" onClick={aplicar}>Aplicar</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Select value={filtro.empresa ?? TODAS} onValueChange={(v) => ir({ empresa: v === TODAS ? undefined : v })}>
        <SelectTrigger className="w-auto min-w-44 gap-2" aria-label="Empresa">
          <span className="text-muted-foreground">Empresa:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas</SelectItem>
          {empresas.map((e) => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <form
        className="relative w-full sm:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          ir({ q: busca.trim() || undefined });
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente ou descrição…"
          aria-label="Buscar por cliente ou descrição"
          className="pl-8"
          enterKeyHint="search"
        />
      </form>

      <span className="basis-full text-xs text-muted-foreground lg:ml-auto lg:basis-auto">
        Vencidos e a vencer pela data de vencimento · pagos pela data do pagamento
      </span>
    </div>
  );
}
