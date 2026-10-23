"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Frase normal, sem caixa-alta (padrão Vantage, design-system/VANTAGE-PADROES.md).
// A tela NÃO passa tipografia, cor, borda nem padding no `className` (o lint
// barra, ver design-system/lint-policy.mjs): escolhe `variant` e `size`.
//
// variant
//   default     rótulo muted de campo
//   foreground  rótulo em destaque (texto principal)
//   forte       título de bloco: texto principal em semibold
//   erro        campo inválido (token de texto de erro)
//   opcao       linha de checkbox/radio/switch: peso normal, entrelinha solta
//   linha       linha de lista de opções com hover (radio de filtro)
//   cartao      opção em cartão com borda (checkbox de vínculo)
//   parcela     cartão de parcela selecionável: lê `data-marcada` e `data-bloqueada`
// size
//   default     text-sm
//   sm          text-xs (rótulos de filtro e de tabela densa)
//
// `size` vem antes de `variant` na lista: o tailwind-merge fica com a última
// classe, então a variante pode trocar o tamanho (`parcela` usa text-base).
const labelVariants = cva(
  "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      size: {
        default: "text-sm",
        sm: "text-xs",
      },
      variant: {
        default: "text-muted-foreground",
        foreground: "text-foreground",
        forte: "font-semibold text-foreground",
        erro: "text-error-text",
        opcao: "cursor-pointer font-normal leading-normal text-foreground",
        linha:
          "flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-muted",
        cartao:
          "flex min-h-11 cursor-pointer items-center gap-3 rounded-controle border px-3 py-2 font-normal leading-normal text-foreground hover:bg-muted",
        parcela:
          "flex min-h-11 flex-col gap-1 rounded-controle border border-dashed border-divisoria px-3.5 py-3 text-base font-normal leading-normal text-foreground tabular-nums transition-colors data-[marcada=true]:border-solid data-[marcada=true]:border-primary data-[marcada=true]:bg-marca-tint data-[bloqueada=true]:cursor-not-allowed [&:not([data-bloqueada=true])]:cursor-pointer [&:not([data-bloqueada=true])]:hover:bg-controle",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, size, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant, size }), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }
