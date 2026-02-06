import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        success:
          "bg-success text-success-foreground shadow-md hover:bg-success/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--glow-primary)] dark:hover:shadow-[var(--glow-accent)]",
        warning:
          "bg-warning text-warning-foreground shadow-md hover:bg-warning/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        error:
          "bg-error text-error-foreground shadow-md hover:bg-error/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        info:
          "bg-info text-info-foreground shadow-md hover:bg-info/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        outline:
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent active:scale-[0.98] transition-all",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)