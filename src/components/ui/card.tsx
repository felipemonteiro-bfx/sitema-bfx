import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-2xl text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-border bg-card shadow-md hover:shadow-lg dark:shadow-[var(--shadow-md)] dark:hover:shadow-[var(--shadow-lg)]",
        elevated: "border border-border bg-card-elevated shadow-lg hover:shadow-xl backdrop-blur-sm dark:shadow-[var(--shadow-lg)] dark:hover:shadow-[var(--shadow-xl)]",
        outline: "border-2 border-border bg-background/50 hover:bg-card/50 hover:shadow-md dark:hover:shadow-[var(--shadow-md)]",
        ghost: "shadow-none hover:bg-card/50 hover:shadow-sm dark:hover:shadow-[var(--shadow-sm)]",
      },
      animated: {
        true: "animate-fade-in-up",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animated: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, animated, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, animated, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

type TrendDirection = "up" | "down" | "neutral"
type ColorVariant = "default" | "success" | "warning" | "error" | "info"

interface CardStatsProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  // `ReactNode` e nao `string` por causa do modo discreto: descricoes como
  // "Margem: 20,5%" precisam ocultar so o numero, entao quem chama envolve o
  // valor num <span className="valor-sensivel"> e passa o no pronto. Texto puro
  // continua valendo (todo string e um ReactNode).
  description?: React.ReactNode
  icon?: LucideIcon
  trend?: {
    value: number
    direction: TrendDirection
    label?: string
  }
  color?: ColorVariant
  // Modo discreto: o `value` e' mascarado por padrao, porque em quase todo card
  // ele e' dinheiro. Card cujo valor e' NOME (o "Top Performance" mostra o
  // vendedor) passa `valorSensivel={false}` — ocultar o nome nao protege nada e
  // so atrapalha quem esta lendo a tela.
  valorSensivel?: boolean
  loading?: boolean
  animated?: boolean
}

// `value` e a cor do numero do KPI. Precisa ser uma classe literal: antes era
// montada como `text-${color}`, que o Tailwind nao detecta ao varrer o codigo.
// Funcionava so por carona — a classe era emitida porque OUTROS arquivos a
// tinham escrita por extenso. Enquanto a carona durar nada quebra; no dia em
// que o ultimo uso literal sair do codigo, o KPI perde a cor em silencio, sem
// erro de build e sem teste vermelho. Classe literal aqui elimina a aposta.
const colorConfig: Record<
  ColorVariant,
  { icon: string; border: string; bg: string; glow: string; value: string }
> = {
  default: {
    icon: "bg-muted text-muted-foreground",
    border: "border-border",
    bg: "",
    glow: "",
    value: "",
  },
  success: {
    icon: "bg-success/10 text-success-text dark:bg-success/20",
    border: "border-success/30 dark:border-success/40",
    bg: "bg-gradient-to-br from-success/5 to-transparent dark:from-success/10",
    glow: "dark:shadow-[var(--glow-primary)]",
    value: "text-success-text",
  },
  warning: {
    icon: "bg-warning/10 text-warning-text dark:bg-warning/20",
    border: "border-warning/30 dark:border-warning/40",
    bg: "bg-gradient-to-br from-warning/5 to-transparent dark:from-warning/10",
    glow: "",
    value: "text-warning-text",
  },
  error: {
    icon: "bg-error-bg text-error-text dark:bg-error/20",
    border: "border-error/30 dark:border-error/40",
    bg: "bg-gradient-to-br from-error/5 to-transparent dark:from-error/10",
    glow: "",
    value: "text-error-text",
  },
  info: {
    icon: "bg-info/10 text-info-text dark:bg-info/20",
    border: "border-info/30 dark:border-info/40",
    bg: "bg-gradient-to-br from-info/5 to-transparent dark:from-info/10",
    glow: "",
    value: "text-info-text",
  },
}

const trendConfig: Record<TrendDirection, { icon: typeof TrendingUp; color: string }> = {
  up: { icon: TrendingUp, color: "text-success-text" },
  down: { icon: TrendingDown, color: "text-error-text" },
  neutral: { icon: Minus, color: "text-muted-foreground" },
}

const CardStats = React.forwardRef<HTMLDivElement, CardStatsProps>(
  ({ 
    className, 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    color = "default",
    valorSensivel = true,
    loading = false,
    animated = true,
    ...props 
  }, ref) => {
    const colorStyles = colorConfig[color]
    const TrendIcon = trend ? trendConfig[trend.direction].icon : null
    const trendColor = trend ? trendConfig[trend.direction].color : ""

    if (loading) {
      return (
        <Card
          ref={ref}
          className={cn(
            "p-6 space-y-3",
            animated && "animate-fade-in-up",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg skeleton-base" />
            <div className="h-4 w-24 skeleton-base" />
          </div>
          <div className="h-8 w-28 skeleton-base" />
          <div className="h-4 w-20 skeleton-base" />
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden p-6",
          colorStyles.border,
          colorStyles.glow,
          animated && "animate-fade-in-up",
          "group cursor-default hover:scale-[1.02] transition-transform",
          className
        )}
        {...props}
      >
        {color !== "default" && (
          <div className={cn("absolute inset-0", colorStyles.bg)} />
        )}
        
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            {Icon && (
              <div className={cn(
                "hidden sm:flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                colorStyles.icon
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
          
          {/* Modo discreto: a marca vai num <span> em volta do numero, nao no <div>.
              O <div> ocupa a largura do card, e a fileira de pontos iria de borda a
              borda; no <span> ela fica do tamanho do valor. Cobre de uma vez os cards
              do dashboard e os de /boletos. */}
          <div className={cn(
            "text-lg font-bold tabular-nums sm:text-2xl",
            colorStyles.value
          )}>
            <span className={cn(valorSensivel && "valor-sensivel")}>{value}</span>
          </div>
          
          {(trend || description) && (
            <div className="flex items-center gap-2 text-sm">
              {trend && TrendIcon && (
                <span className={cn("flex items-center gap-1 font-medium", trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  {/* Modo discreto: so a porcentagem some; a seta fica, como o icone
                      do card, porque e o rotulo da direcao e nao o valor. */}
                  <span className="valor-sensivel">
                    {trend.value > 0 && "+"}
                    {Number(trend.value.toFixed(1))}%
                  </span>
                </span>
              )}
              {description && (
                <span className="text-muted-foreground">{description}</span>
              )}
              {trend?.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
      </Card>
    )
  }
)
CardStats.displayName = "CardStats"


export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardStats,
  cardVariants,
}
