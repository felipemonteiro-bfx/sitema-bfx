"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, AlertCircle, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-lg border-2 bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      state: {
        default: "border-input hover:border-accent/50 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 dark:focus-visible:shadow-[var(--glow-primary)]",
        error: "border-error/60 bg-error/5 hover:border-error focus-visible:outline-none focus-visible:border-error focus-visible:ring-2 focus-visible:ring-error/20",
        success: "border-success/60 bg-success/5 hover:border-success focus-visible:outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/20",
        warning: "border-warning/60 bg-warning/5 hover:border-warning focus-visible:outline-none focus-visible:border-warning focus-visible:ring-2 focus-visible:ring-warning/20",
      },
      inputSize: {
        sm: "h-8 px-2 text-xs",
        default: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      state: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showStateIcon?: boolean
  onClear?: () => void
  clearable?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    state,
    inputSize,
    leftIcon,
    rightIcon,
    showStateIcon = false,
    onClear,
    clearable = false,
    value,
    ...props 
  }, ref) => {
    const hasValue = value !== undefined && value !== ""
    
    const StateIcon = React.useMemo(() => {
      if (!showStateIcon) return null
      switch (state) {
        case "error":
          return <AlertCircle className="h-4 w-4 text-error" />
        case "success":
          return <CheckCircle2 className="h-4 w-4 text-success" />
        default:
          return null
      }
    }, [state, showStateIcon])
    
    const showClearButton = clearable && hasValue && onClear
    
    if (leftIcon || rightIcon || StateIcon || showClearButton) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            value={value}
            className={cn(
              inputVariants({ state, inputSize }),
              leftIcon && "pl-10",
              (rightIcon || StateIcon || showClearButton) && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {showClearButton && (
              <button
                type="button"
                onClick={onClear}
                className="text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {StateIcon}
            {rightIcon && !StateIcon && (
              <span className="text-muted-foreground pointer-events-none">{rightIcon}</span>
            )}
          </div>
        </div>
      )
    }
    
    return (
      <input
        type={type}
        value={value}
        className={cn(inputVariants({ state, inputSize }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

interface SearchInputProps extends Omit<InputProps, "leftIcon" | "type"> {
  onSearch?: (value: string) => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onClear, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        clearable
        onClear={onClear}
        className={cn("pr-10", className)}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, SearchInput, inputVariants }
