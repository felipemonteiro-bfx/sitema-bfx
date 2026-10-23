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
    forma,
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
          className={cn(buttonVariants({ variant, size, forma, className }))}
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
          buttonVariants({ variant, size, forma, className }),
          loading && "relative"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* `children` vai DIRETO, sem <span> de embrulho.
            O embrulho era a causa raiz da quebra de linha dentro do botao: o
            preflight do Tailwind declara `svg { display: block }`, entao um
            <Button><Icone/>Texto</Button> tinha o icone virando um BLOCO dentro
            de um <span> inline — e bloco dentro de inline parte a linha. Medido
            em producao no "Copiar Link" de /historico: botao de 44px de altura,
            <svg> em top 890.5 e o texto em top 905.5. Duas linhas. O
            `whitespace-nowrap` da base nao salvava, porque a quebra nao era do
            texto: era estrutural.
            Sem o <span>, o <svg> volta a ser item flex do proprio botao, ao lado
            do texto, e o `gap-2` da base os separa.
            O <span> so aparece para esconder o rotulo durante o loading, e ai
            precisa ser `inline-flex` pelo mesmo motivo.

            Tambem nao ha mais `mr-2`/`ml-2` nos wrappers de icone: a base ja tem
            `gap-2` e os dois somavam — medido 16.00px onde a escala pede 8. */}
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>
        )}
        {loading && !loadingText && children ? (
          // `&& children`: sem isso o <IconButton> em loading (children === null)
          // ganharia um item flex vazio, e item flex vazio ainda consome um
          // `gap-2` — 8px fantasma deslocando o spinner do centro.
          <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
        ) : loading ? (
          loadingText
        ) : (
          children
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
