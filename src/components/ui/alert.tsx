import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-200 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/50 bg-destructive/5 text-destructive dark:border-destructive/50 dark:bg-destructive/10 [&>svg]:text-destructive",
        success:
          "border-success/50 bg-success/5 text-success dark:border-success/50 dark:bg-success/10 [&>svg]:text-success",
        warning:
          "border-warning/50 bg-warning/5 text-warning dark:border-warning/50 dark:bg-warning/10 [&>svg]:text-warning",
        error:
          "border-error/50 bg-error/5 text-error dark:border-error/50 dark:bg-error/10 [&>svg]:text-error",
        info:
          "border-info/50 bg-info/5 text-info dark:border-info/50 dark:bg-info/10 [&>svg]:text-info",
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
        {showIcon && Icon && <Icon className="h-4 w-4" />}
        {children}
        {dismissible && (
          <button
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
      className={cn("flex items-start justify-between gap-4", className)}
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
