import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Package,
  Users,
  ShoppingCart,
  FileText,
  Search,
  Inbox,
  Calendar,
  BarChart3,
  AlertCircle,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

type EmptyStateVariant =
  | "default"
  | "sales"
  | "clients"
  | "products"
  | "reports"
  | "search"
  | "inbox"
  | "calendar"
  | "charts"
  | "error"
  | "folder";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const variantConfig: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  default: {
    icon: Inbox,
    title: "Nenhum dado encontrado",
    description: "Não há informações para exibir no momento.",
  },
  sales: {
    icon: ShoppingCart,
    title: "Nenhuma venda registrada",
    description: "Quando você realizar vendas, elas aparecerão aqui.",
  },
  clients: {
    icon: Users,
    title: "Nenhum cliente cadastrado",
    description: "Comece adicionando seu primeiro cliente.",
  },
  products: {
    icon: Package,
    title: "Nenhum produto cadastrado",
    description: "Adicione produtos ao seu catálogo para começar.",
  },
  reports: {
    icon: FileText,
    title: "Nenhum relatório disponível",
    description: "Relatórios serão gerados conforme você utiliza o sistema.",
  },
  search: {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente ajustar os filtros ou termos de busca.",
  },
  inbox: {
    icon: Inbox,
    title: "Caixa de entrada vazia",
    description: "Você não tem novas mensagens ou notificações.",
  },
  calendar: {
    icon: Calendar,
    title: "Nenhum evento agendado",
    description: "Seu calendário está limpo para este período.",
  },
  charts: {
    icon: BarChart3,
    title: "Dados insuficientes",
    description: "Mais dados são necessários para gerar visualizações.",
  },
  error: {
    icon: AlertCircle,
    title: "Algo deu errado",
    description: "Não foi possível carregar as informações. Tente novamente.",
  },
  folder: {
    icon: FolderOpen,
    title: "Pasta vazia",
    description: "Esta pasta não contém nenhum arquivo.",
  },
};

const sizeConfig = {
  sm: {
    container: "py-8",
    icon: "h-10 w-10",
    iconWrapper: "h-16 w-16",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    container: "py-12",
    icon: "h-12 w-12",
    iconWrapper: "h-20 w-20",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    iconWrapper: "h-24 w-24",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const Icon = icon || config.icon;

  const ActionButton = action?.href ? "a" : "button";
  const SecondaryButton = secondaryAction?.href ? "a" : "button";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in-up",
        sizeStyles.container,
        className
      )}
    >
      <div
        className={cn(
          "relative mb-4 flex items-center justify-center rounded-full",
          "bg-muted/50 dark:bg-muted/30",
          "ring-1 ring-border/50",
          sizeStyles.iconWrapper
        )}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/5 to-accent/5" />
        <Icon
          className={cn(
            "relative text-muted-foreground/70 animate-float",
            sizeStyles.icon
          )}
          strokeWidth={1.5}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          sizeStyles.title
        )}
      >
        {title || config.title}
      </h3>

      <p
        className={cn(
          "text-muted-foreground max-w-sm mb-6",
          sizeStyles.description
        )}
      >
        {description || config.description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              asChild={!!action.href}
              onClick={action.onClick}
              className="hover-lift"
            >
              {action.href ? (
                <a href={action.href}>{action.label}</a>
              ) : (
                action.label
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              asChild={!!secondaryAction.href}
              onClick={secondaryAction.onClick}
              className="hover-lift"
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyStateInline({
  message,
  icon: Icon = Inbox,
  className,
}: {
  message: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-4 text-muted-foreground animate-fade-in",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function EmptyStateCard({
  variant = "default",
  title,
  description,
  action,
  className,
}: Omit<EmptyStateProps, "size" | "secondaryAction">) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/70 bg-card/50 p-8",
        "flex flex-col items-center justify-center text-center",
        "hover:border-border hover:bg-card/80 transition-all duration-200",
        "animate-fade-in-scale",
        className
      )}
    >
      <div className="mb-3 rounded-lg bg-muted/50 p-3">
        <Icon className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.5} />
      </div>
      <h4 className="font-medium text-foreground mb-1">
        {title || config.title}
      </h4>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {description || config.description}
      </p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={action.onClick}
          asChild={!!action.href}
          className="hover-lift"
        >
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  );
}
