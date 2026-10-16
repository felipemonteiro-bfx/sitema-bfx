"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseDataISO, dataExibidaDoInput, dataParaHidden, selecaoDeDataDoCalendario } from "@/lib/data-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateInputProps {
  id?: string
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  "aria-label"?: string
  disabled?: boolean
  required?: boolean
  /** "YYYY-MM-DD": dias depois dele ficam desabilitados no calendario. */
  max?: string
  /** `error`: campo invalido; `destaque`: valor alterado pelo usuario (borda da marca). */
  state?: "default" | "error" | "destaque"
  /** `celula`: campo dentro de uma celula de planilha editavel (sem moldura, compacto). */
  variant?: "default" | "celula"
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, name, defaultValue, value, onChange, className, disabled, required, max, state = "default", variant = "default", ...props }, ref) => {
    const [open, setOpen] = React.useState(false)
    const controlado = value !== undefined
    const [interno, setInterno] = React.useState<Date | undefined>(() =>
      parseDataISO(value || defaultValue)
    )

    // Quando o pai controla, a data vem sempre do `value` atual. Antes ela era
    // congelada no inicializador do useState, entao um formulario que preenche
    // o campo depois da montagem (produto-form-client faz isso num useEffect)
    // continuava mostrando "Selecionar data" — e o hidden mandava "", apagando
    // a data no banco ao salvar.
    const date = dataExibidaDoInput({ controlado, value, interno })

    // Nao controlado: se o defaultValue mudar (mesmo campo reaproveitado para
    // outro registro, sem desmontar), o estado inicial ficaria do anterior.
    React.useEffect(() => {
      if (controlado) return
      setInterno(parseDataISO(defaultValue))
    }, [controlado, defaultValue])

    const handleSelect = (selectedDate: Date | undefined) => {
      const { novaData, limpar } = selecaoDeDataDoCalendario({
        selecionada: selectedDate,
        obrigatorio: required,
      })
      setOpen(false)
      // Toque no dia que ja estava selecionado (toggle-off do calendario): so limpa
      // onde limpar e' valido — regra em `selecaoDeDataDoCalendario`.
      if (novaData === undefined && !limpar) return
      if (!controlado) setInterno(selectedDate)
      if (novaData !== undefined) onChange?.(novaData)
    }

    const formattedDate = date
      ? format(date, "dd/MM/yyyy", { locale: ptBR })
      : "Selecionar data"

    const inputValue = dataParaHidden(date)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              // Sem sombra (D-03): botao tem border-2 propria e vive no mesmo
              // plano do card/formulario — nao e um plano acima.
              "flex h-10 w-full items-center justify-between rounded-lg border-2 border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-accent/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card dark:border-input",
              !date && "text-muted-foreground",
              state === "error" && "border-error",
              state === "destaque" && "border-primary",
              variant === "celula" &&
                "h-auto rounded border-0 bg-transparent p-1 text-xs focus:ring-1 focus-visible:ring-1 focus-visible:ring-ring",
              className
            )}
          >
            <span>{formattedDate}</span>
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            // Sem `defaultMonth` o calendario SEMPRE abre no mes de hoje: em
            // react-day-picker v9 o mes inicial e' `month || defaultMonth || today` —
            // `selected` nao entra na conta — e o Popover desmonta o conteudo ao
            // fechar, entao toda abertura recomecava em hoje. A parcela que vence em
            // abril/2027 abria em agosto/2026, sem dia marcado, e so dava para chegar
            // la clicando o chevron mes a mes.
            defaultMonth={date}
            // Desliga o toggle-off na origem onde limpar nao e' operacao valida: sem
            // isto o calendario devolve `undefined` ao tocar no dia ja selecionado.
            required={required}
            disabled={max ? { after: parseDataISO(max)! } : undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
        <input
          ref={ref}
          type="hidden"
          name={name}
          value={inputValue}
          required={required}
        />
      </Popover>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
