import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Vantage: o painel e plano. Sem sombra em nenhuma variante (a sombra era o que
// fazia o card "flutuar" sobre a casca); a separacao vem do degrau de superficie
// (--card sobre --background) e do contorno decorativo `border-painel-borda`.
// O raio e por degrau: painel 20px, card interno 14px. Fica DENTRO de cada
// variante (e nao na base) porque o `cn` (tailwind-merge) nao conhece os raios
// customizados e nao os deduplicaria com um `rounded-*` vindo do chamador.
const cardVariants = cva(
  "text-card-foreground transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "rounded-painel border border-painel-borda bg-card",
        elevated: "rounded-interno border border-painel-borda bg-card-elevated",
        outline: "rounded-painel border border-painel-borda bg-card hover:bg-poco",
        ghost: "rounded-painel hover:bg-poco",
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
    className={cn("font-display text-lg font-semibold leading-none tracking-tight text-foreground", className)}
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

// Vantage: o tom NAO pinta o card (nem borda, nem fundo, nem o valor). Ele vira so um
// ponto ao lado do rotulo, que e o lugar de estado nos padroes. Classes literais para o
// Tailwind detectar; o valor do KPI fica sempre em `text-foreground`.
const tomPonto: Record<ColorVariant, string> = {
  default: "",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
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
    const ponto = tomPonto[color]
    const TrendIcon = trend ? trendConfig[trend.direction].icon : null
    const trendColor = trend ? trendConfig[trend.direction].color : ""

    if (loading) {
      return (
        <Card
          ref={ref}
          variant="elevated"
          className={cn(
            "space-y-3 border-0 px-5 py-4",
            animated && "anim-entrada",
            className
          )}
          {...props}
        >
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        variant="elevated"
        className={cn(
          "space-y-3 border-0 px-5 py-4",
          animated && "anim-entrada",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
            {ponto && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", ponto)} />}
            <span className="truncate">{title}</span>
          </span>
          {Icon && <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />}
        </div>

        {/* Modo discreto: a marca vai num <span> em volta do numero, nao no <div>.
            O <div> ocupa a largura do card, e a fileira de pontos iria de borda a
            borda; no <span> ela fica do tamanho do valor. Cobre de uma vez os cards
            do dashboard e os de /boletos. */}
        <div className="truncate font-mono text-2xl font-medium tracking-tight text-foreground tabular-nums">
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
