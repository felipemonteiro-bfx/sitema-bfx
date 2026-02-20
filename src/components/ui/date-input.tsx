"use client"

import * as React from "react"
import { format, parse } from "date-fns"
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
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  "aria-label"?: string
  disabled?: boolean
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ name, defaultValue, value, onChange, className, disabled, ...props }, ref) => {
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
              "w-full justify-start text-left font-normal h-10",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formattedDate}
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
          type="hidden"
          name={name}
          value={inputValue}
          {...props}
        />
      </Popover>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
