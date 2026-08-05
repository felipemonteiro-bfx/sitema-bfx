"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading
    const temConteudo =
      (loading && Boolean(loadingText)) ||
      (children !== null && children !== undefined && children !== false && children !== "")

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "relative"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Sem `mr-2`/`ml-2`: a base do buttonVariants ja aplica `gap-2`, e os
            dois somavam — medido 16.00px entre icone e texto onde a escala do
            design system pede 8. E o `<span>` de children so e renderizado
            quando ha o que renderizar: item flex vazio ainda consome um `gap-2`
            e deixa um recuo fantasma no fim do botao. */}
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>
        )}
        {temConteudo && (
          <span className={cn(loading && !loadingText && "opacity-0")}>
            {loading && loadingText ? loadingText : children}
          </span>
        )}
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

interface IconButtonProps
  extends Omit<ButtonProps, "leftIcon" | "rightIcon" | "loadingText"> {
  icon: React.ReactNode
  "aria-label": string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, loading, size = "icon", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        loading={loading}
        className={cn("p-0", className)}
        {...props}
      >
        {loading ? null : icon}
      </Button>
    )
  }
)
IconButton.displayName = "IconButton"

export { Button, IconButton, buttonVariants }
