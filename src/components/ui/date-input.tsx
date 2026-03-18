"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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
    const [date, setDate] = React.useState<Date | undefined>(() => {
      const initialValue = value || defaultValue
      if (initialValue) {
        return new Date(initialValue + "T00:00:00")
      }
      return undefined
    })

    const handleSelect = (selectedDate: Date | undefined) => {
      setDate(selectedDate)
      setOpen(false)
      if (onChange && selectedDate) {
        onChange(format(selectedDate, "yyyy-MM-dd"))
      }
    }

    const formattedDate = date
      ? format(date, "dd/MM/yyyy", { locale: ptBR })
      : "Selecionar data"

    const inputValue = date ? format(date, "yyyy-MM-dd") : ""

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full font-normal h-10",
              className
            )}
          >
            <span className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className={cn("min-w-0 truncate", !date && "text-muted-foreground")}>
                {formattedDate}
              </span>
              <CalendarIcon className="h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
            </span>
          </Button>
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
          id={id}
          type="hidden"
          name={name}
          value={inputValue}
          required={required}
          {...props}
        />
      </Popover>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
