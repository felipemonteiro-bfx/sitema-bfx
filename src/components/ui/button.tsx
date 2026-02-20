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
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 inline-flex">{leftIcon}</span>
        )}
        <span className={cn(loading && !loadingText && "opacity-0")}>
          {loading && loadingText ? loadingText : children}
        </span>
        {!loading && rightIcon && (
          <span className="ml-2 inline-flex">{rightIcon}</span>
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