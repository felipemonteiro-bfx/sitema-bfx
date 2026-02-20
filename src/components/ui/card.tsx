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
        outline: "border-2 border-border bg-background/50 hover:bg-card/50 hover:shadow-md",
        ghost: "shadow-none hover:bg-card/50 hover:shadow-sm",
        glass: "glass border border-white/20 dark:border-white/10 shadow-lg backdrop-blur-xl",
        interactive: "border border-border bg-card shadow-md cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:border-accent/50 active:scale-[0.98] dark:shadow-[var(--shadow-md)] dark:hover:shadow-[var(--glow-primary)]",
        gradient: "border-0 bg-gradient-to-br from-card to-muted/50 shadow-lg dark:from-card dark:to-card-elevated",
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
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    direction: TrendDirection
    label?: string
  }
  color?: ColorVariant
  loading?: boolean
  animated?: boolean
}

const colorConfig: Record<ColorVariant, { icon: string; border: string; bg: string; glow: string }> = {
  default: {
    icon: "bg-muted text-muted-foreground",
    border: "border-border",
    bg: "",
    glow: "",
  },
  success: {
    icon: "bg-success/10 text-success dark:bg-success/20",
    border: "border-success/30 dark:border-success/40",
    bg: "bg-gradient-to-br from-success/5 to-transparent dark:from-success/10",
    glow: "dark:shadow-[var(--glow-primary)]",
  },
  warning: {
    icon: "bg-warning/10 text-warning dark:bg-warning/20",
    border: "border-warning/30 dark:border-warning/40",
    bg: "bg-gradient-to-br from-warning/5 to-transparent dark:from-warning/10",
    glow: "",
  },
  error: {
    icon: "bg-error/10 text-error dark:bg-error/20",
    border: "border-error/30 dark:border-error/40",
    bg: "bg-gradient-to-br from-error/5 to-transparent dark:from-error/10",
    glow: "",
  },
  info: {
    icon: "bg-info/10 text-info dark:bg-info/20",
    border: "border-info/30 dark:border-info/40",
    bg: "bg-gradient-to-br from-info/5 to-transparent dark:from-info/10",
    glow: "",
  },
}

const trendConfig: Record<TrendDirection, { icon: typeof TrendingUp; color: string }> = {
  up: { icon: TrendingUp, color: "text-success" },
  down: { icon: TrendingDown, color: "text-error" },
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
                "flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                colorStyles.icon
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <div className={cn(
            "text-2xl font-bold tabular-nums",
            color !== "default" && `text-${color}`
          )}>
            {value}
          </div>
          
          {(trend || description) && (
            <div className="flex items-center gap-2 text-sm">
              {trend && TrendIcon && (
                <span className={cn("flex items-center gap-1 font-medium", trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  {trend.value > 0 && "+"}
                  {trend.value}%
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

interface CardGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: "sm" | "md" | "lg" | "xl"
}

const CardGlass = React.forwardRef<HTMLDivElement, CardGlassProps>(
  ({ className, blur = "md", children, ...props }, ref) => {
    const blurClasses = {
      sm: "backdrop-blur-sm",
      md: "backdrop-blur-md",
      lg: "backdrop-blur-lg",
      xl: "backdrop-blur-xl",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-white/20 dark:border-white/10",
          "bg-white/60 dark:bg-black/40",
          blurClasses[blur],
          "shadow-lg dark:shadow-[var(--shadow-lg)]",
          "transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardGlass.displayName = "CardGlass"

interface CardInteractiveProps extends CardProps {
  onClick?: () => void
  href?: string
}

const CardInteractive = React.forwardRef<HTMLDivElement, CardInteractiveProps>(
  ({ className, onClick, href, children, ...props }, ref) => {
    const content = (
      <Card
        ref={ref}
        variant="interactive"
        className={cn(className)}
        onClick={onClick}
        {...props}
      >
        {children}
      </Card>
    )

    if (href) {
      return <a href={href}>{content}</a>
    }

    return content
  }
)
CardInteractive.displayName = "CardInteractive"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardStats,
  CardGlass,
  CardInteractive,
  cardVariants,
}
