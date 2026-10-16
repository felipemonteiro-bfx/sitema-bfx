'use client';

// Lote por parcela (2026-09-30, Fase 3): dentro da fila, as parcelas em aberto de uma venda viram
// caixas marcáveis — a venda pode ir à Prudent com 3 de 4 parcelas. Desmarcar acrescenta o id à
// exclusão, que o card de seleção, o CSV e o lote recebem. Parcela ainda não confirmada pelo RH
// aparece travada. A tela só mostra: quem decide o que entra é o servidor.

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn, formatBRL } from "@/lib/utils";
import { formatarDataPura } from "@/lib/data-pura";
import { algumMesNoIntervalo } from "@/lib/periodo-meses";
import type { ParcelasDaVenda } from "@/lib/antecipacao-compradores";

interface Props {
  vendaId: number;
  parcelas: ParcelasDaVenda;
  vendaSelecionada: boolean;
  excluidas: number[];
  onToggle: (parcelaId: number) => void;
  periodoInicio: string;
  periodoFim: string;
  desabilitado?: boolean;
}

type Motivo = "aguardando" | "recusada" | "fora_periodo" | null;

const TEXTO_TRAVA: Record<Exclude<Motivo, null>, string> = {
  aguardando: "Aguardando RH",
  recusada: "Recusada pelo RH",
  fora_periodo: "Fora do período",
};

export function ParcelasLoteFila({
  vendaId,
  parcelas,
  vendaSelecionada,
  excluidas,
  onToggle,
  periodoInicio,
  periodoFim,
  desabilitado,
}: Props) {
  // Só parcela em aberto pode ir a um lote; antecipada, paga e em andamento ficam de fora.
  const abertas = parcelas.lista.filter((p) => p.situacao === "a_antecipar" || p.situacao === "vencida");
  const total = parcelas.quantidade;

  if (abertas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma parcela em aberto nesta venda.</p>;
  }

  return (
    <fieldset className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="sr-only">Parcelas da venda V{vendaId}</legend>
      {abertas.map((p) => {
        const motivo: Motivo =
          p.confirmacao === "aguardando"
            ? "aguardando"
            : p.confirmacao === "recusada"
              ? "recusada"
              : !algumMesNoIntervalo([p.vencimento.slice(0, 7)], periodoInicio, periodoFim)
                ? "fora_periodo"
                : null;
        const travada = motivo !== null || p.id === undefined;
        const marcada = !travada && vendaSelecionada && !excluidas.includes(p.id as number);
        const inputId = `parcela-lote-${vendaId}-${p.numero}`;
        return (
          <label
            key={p.id ?? p.numero}
            htmlFor={inputId}
            className={cn(
              "flex min-h-11 flex-col gap-1 rounded-controle px-3.5 py-3 tabular-nums transition-colors",
              marcada
                ? "border border-primary bg-marca-tint"
                : "border border-dashed border-divisoria",
              travada || !vendaSelecionada || desabilitado ? "cursor-not-allowed" : "cursor-pointer hover:bg-accent/50"
            )}
          >
            <span className="flex items-center gap-2 font-bold text-foreground">
              <Checkbox
                id={inputId}
                checked={marcada}
                disabled={travada || !vendaSelecionada || desabilitado}
                onCheckedChange={() => p.id !== undefined && onToggle(p.id)}
              />
              {p.numero} de {total}
              {p.confirmacao === "legado" && (
                <Badge
                  variant="outline"
                  className="ml-auto text-xs font-medium text-muted-foreground"
                  title="Legado — sem confirmação do RH"
                >
                  legado
                </Badge>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {motivo ? (
                <>
                  <span className={motivo === "fora_periodo" ? undefined : "font-semibold text-warning-text"}>
                    {TEXTO_TRAVA[motivo]}
                  </span>
                  {" · "}vence {formatarDataPura(p.vencimento)}
                </>
              ) : marcada || !vendaSelecionada ? (
                <>
                  vence {formatarDataPura(p.vencimento)} · <span className="valor-sensivel">{formatBRL(p.valor)}</span>
                </>
              ) : (
                "fica com a BFX"
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
