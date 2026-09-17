"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  chaveDoMes,
  estadoDoMes,
  intervaloEsteMes,
  intervaloProximosMeses,
  mesesDoAno,
  proximoIntervalo,
  rotuloIntervalo,
  valorCompacto,
  type EstadoMes,
} from "@/lib/periodo-meses";

const NOMES_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface Props {
  /** MM/AAAA ou "" — o mesmo formato que `parsePeriodoMesAno` lê. */
  inicio: string;
  fim: string;
  onChange: (inicio: string, fim: string) => void;
  /** Dia civil de Manaus, YYYY-MM-DD. */
  hoje: string;
  /** Quanto falta antecipar em cada mês de vencimento, por chave YYYY-MM. */
  valoresPorMes?: Record<string, number>;
  /** Um mês só (competência da folha): o clique escolhe o mês e fecha. */
  unico?: boolean;
  id?: string;
  className?: string;
}

// Pontas e mês único em preenchimento primário; o miolo do intervalo num tint
// da mesma matiz, para a faixa se ler como um bloco contínuo.
const ESTILO_MES: Record<EstadoMes, string> = {
  inicio: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  fim: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  unico: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  dentro: "bg-primary/10 text-foreground hover:bg-primary/15 hover:text-foreground",
  fora: "text-foreground",
};

/**
 * Seletor de intervalo de meses da fila de antecipação, em Popover + Button do
 * shadcn. Primeiro clique marca o início, o segundo o fim (inverte se vier
 * antes); cada mês mostra quanto falta antecipar nele, para a escolha já
 * mostrar o tamanho do lote. As regras puras moram em `@/lib/periodo-meses`.
 */
export function IntervaloMesesPicker({ inicio, fim, onChange, hoje, valoresPorMes = {}, unico = false, id, className }: Props) {
  const [aberto, setAberto] = React.useState(false);
  const [aguardandoFim, setAguardandoFim] = React.useState(false);
  const anoAtual = Number(hoje.slice(0, 4));
  const [ano, setAno] = React.useState(() => Number((inicio || "").split("/")[1]) || anoAtual);

  // Estado local só para "falta o mês final"; as pontas vêm sempre das props,
  // então "Limpar filtros" lá fora zera o seletor também.
  const intervalo = { inicio, fim, aguardandoFim: aguardandoFim && Boolean(inicio) };
  const rotulo = rotuloIntervalo(inicio, fim);
  const mesDeHoje = `${hoje.slice(5, 7)}/${hoje.slice(0, 4)}`;

  const aplicar = (novo: { inicio: string; fim: string; aguardandoFim: boolean }, fechar: boolean) => {
    setAguardandoFim(novo.aguardandoFim);
    onChange(novo.inicio, novo.fim);
    if (fechar) setAberto(false);
  };

  const aoAbrir = (abrir: boolean) => {
    setAberto(abrir);
    if (abrir) {
      setAno(Number((inicio || "").split("/")[1]) || anoAtual);
    } else {
      setAguardandoFim(false);
    }
  };

  return (
    <Popover open={aberto} onOpenChange={aoAbrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="dialog"
          className={cn(
            // Mesma pele do gatilho do FormSelect, ao lado dele na barra de filtros.
            "flex h-11 w-full items-center gap-2 whitespace-nowrap rounded-lg border-2 border-input bg-background px-3 text-sm text-foreground ring-offset-background transition-all duration-200 hover:border-accent/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:h-10 sm:w-60 dark:bg-card",
            !rotulo && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left tabular-nums">{rotulo ?? "Qualquer mês"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[20rem] p-3">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="iconSm" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">{ano}</span>
          <Button type="button" variant="ghost" size="iconSm" aria-label="Próximo ano" onClick={() => setAno((a) => a + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {unico ? "Escolha o mês" : intervalo.aguardandoFim ? "Agora escolha o mês final" : "Escolha o mês inicial"}
        </p>

        <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label={`Meses de ${ano}`}>
          {mesesDoAno(ano).map((mes, i) => {
            const estado = estadoDoMes(mes, intervalo);
            const valor = valorCompacto(valoresPorMes[chaveDoMes(mes)] ?? 0);
            const selecionado = estado !== "fora";
            const preenchido = estado === "inicio" || estado === "fim" || estado === "unico";
            return (
              <Button
                key={mes}
                type="button"
                variant="ghost"
                aria-pressed={selecionado}
                aria-current={mes === mesDeHoje ? "date" : undefined}
                aria-label={`${NOMES_MESES[i]} de ${ano}${valor ? `, falta antecipar ${valor}` : ""}`}
                onClick={() =>
                  unico
                    ? aplicar({ inicio: mes, fim: mes, aguardandoFim: false }, true)
                    : aplicar(proximoIntervalo(intervalo, mes), intervalo.aguardandoFim)
                }
                className={cn(
                  "h-14 flex-col gap-0 rounded-md px-1 font-semibold",
                  ESTILO_MES[estado],
                  // Mês de hoje: contorno, para achar o "agora" sem ler o ano.
                  mes === mesDeHoje && !preenchido && "ring-1 ring-inset ring-primary/50"
                )}
              >
                <span className="text-sm leading-5">{NOMES_MESES[i]}</span>
                <span
                  className={cn(
                    // min-h-4: mês sem valor mantém a mesma altura dos outros.
                    "min-h-4 text-xs font-medium leading-4 tabular-nums",
                    preenchido ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {valor || " "}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => aplicar(intervaloEsteMes(hoje), true)}>
            Este mês
          </Button>
          {!unico && (
            <Button type="button" variant="outline" size="sm" onClick={() => aplicar(intervaloProximosMeses(hoje, 3), true)}>
              Próximos 3 meses
            </Button>
          )}
          {rotulo && !unico && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => aplicar({ inicio: "", fim: "", aguardandoFim: false }, true)}
            >
              Limpar
            </Button>
          )}
        </div>
        {!unico && (
          <p className="mt-2 text-xs text-muted-foreground">Valor em cada mês: quanto falta antecipar com vencimento nele.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
