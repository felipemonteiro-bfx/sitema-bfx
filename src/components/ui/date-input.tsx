"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseDataISO, dataExibidaDoInput, dataParaHidden } from "@/lib/data-input"
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
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, name, defaultValue, value, onChange, className, disabled, required, ...props }, ref) => {
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
      if (!controlado) setInterno(selectedDate)
      setOpen(false)
      if (onChange && selectedDate) {
        onChange(format(selectedDate, "yyyy-MM-dd"))
      }
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
              "flex h-10 w-full items-center justify-between rounded-lg border-2 border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-all duration-200 hover:border-accent/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card dark:border-input",
              !date && "text-muted-foreground",
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
