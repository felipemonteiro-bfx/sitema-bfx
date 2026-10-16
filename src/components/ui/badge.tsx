import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Sem sombra (D-03): selo preenchido, dentro de tabela ou card — no
        // mesmo plano do conteudo, nao um plano acima.
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: 
          "text-foreground border-border hover:bg-muted",
        // Selo de marca do Vantage: tint verde OPACO + texto `marca-tint-texto`
        // (5.60:1 no claro, 7.02:1 no escuro). Nunca `text-primary` sobre o
        // tint: no claro fica em 4.45:1.
        marca:
          "border-transparent bg-marca-tint text-marca-tint-texto",
        // Tint OPACO no tema claro (`bg-<sem>-bg`), nao o composto
        // `bg-<sem>/10`. O composto da propria matiz escurece o tom, e o quanto
        // ele escurece depende do que estiver EMBAIXO: sobre `--card` o badge
        // info dava 4.59:1, mas sobre `bg-muted/30` (a linha do "Hall da Fama"
        // do /dashboard) caia para 4.49:1 — reprovado, com o token certo por
        // cima. O tint opaco nao depende do fundo: 4.71:1 em qualquer lugar.
        // O escuro segue no composto, onde `--<sem>-bg` ja tem alfa.
        success:
          "border-success/30 bg-success-bg text-success-text dark:bg-success/20 dark:border-success/40 hover:bg-success/20 dark:hover:bg-success/30",
        warning:
          "border-warning/30 bg-warning-bg text-warning-text dark:bg-warning/20 dark:border-warning/40 hover:bg-warning/20 dark:hover:bg-warning/30",
        error:
          "border-error/30 bg-error-bg text-error-text dark:bg-error/20 dark:border-error/40 hover:bg-error/20 dark:hover:bg-error/30",
        info:
          "border-info/30 bg-info-bg text-info-text dark:bg-info/20 dark:border-info/40 hover:bg-info/20 dark:hover:bg-info/30",
        successSolid:
          "border-transparent bg-success text-success-foreground hover:bg-success/90",
        warningSolid:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/90",
        errorSolid:
          "border-transparent bg-error text-error-foreground hover:bg-error/90",
        infoSolid:
          "border-transparent bg-info text-info-foreground hover:bg-info/90",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        // `discreto`: contorno neutro com texto muted (anotacao ao lado de um titulo).
        discreto: "border-border bg-transparent font-medium text-muted-foreground",
      },
      // Numero ou codigo: Geist Mono tabular.
      numerico: {
        true: "font-mono tabular-nums",
        false: "",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      animated: {
        true: "animate-fade-in-scale",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animated: false,
      numerico: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, animated, numerico, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, animated, numerico }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
