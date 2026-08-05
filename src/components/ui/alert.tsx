import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/50 bg-destructive/5 text-destructive dark:border-destructive/50 dark:bg-destructive/10 [&>svg]:text-destructive",
        success:
          "border-success/50 bg-success-bg text-success-text dark:border-success/50 dark:bg-success/10 [&>svg]:text-success-text",
        warning:
          "border-warning/50 bg-warning-bg text-warning-text dark:border-warning/50 dark:bg-warning/10 [&>svg]:text-warning-text",
        error:
          "border-error/50 bg-error-bg text-error-text dark:border-error/50 dark:bg-error/10 [&>svg]:text-error-text",
        info:
          "border-info/50 bg-info-bg text-info-text dark:border-info/50 dark:bg-info/10 [&>svg]:text-info-text",
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

const variantIcons = {
  default: null,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, animated, showIcon = false, dismissible = false, onDismiss, children, ...props }, ref) => {
    const Icon = variant ? variantIcons[variant] : null;
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, animated }), className)}
        {...props}
      >
        {showIcon && Icon && (
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {children}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

interface AlertBannerProps extends AlertProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ title, description, action, variant = "info", className, ...props }, ref) => (
    <Alert
      ref={ref}
      variant={variant}
      showIcon
      animated
      className={cn("justify-between gap-4", className)}
      {...props}
    >
      <div className="flex-1">
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </Alert>
  )
);
AlertBanner.displayName = "AlertBanner"

export { Alert, AlertTitle, AlertDescription, AlertBanner, alertVariants }
