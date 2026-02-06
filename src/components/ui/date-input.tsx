import * as React from "react"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type DateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="date"
          className={cn(
            "pl-10 bg-background hover:bg-accent/50 transition-colors cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:opacity-60",
            "hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
            "[&::-webkit-calendar-picker-indicator]:transition-opacity",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
