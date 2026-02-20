"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  Brain,
  FileText,
  FolderPlus,
  Settings,
  ShoppingCart,
  Wallet,
  Users,
  ReceiptText,
  ClipboardList,
  User,
  History,
  Upload,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  external?: boolean;
  badge?: string | number;
  isNew?: boolean;
};

type MenuGroup = {
  label?: string;
  items: MenuItem[];
};

const iconMap: Record<string, LucideIcon> = {
  "/dashboard": BarChart3,
  "/financeiro": Wallet,
  "/prudent": ReceiptText,
  "/inteligencia": Brain,
  "/importacao": Upload,
  "/venda-rapida": ShoppingCart,
  "/historico": History,
  "/cadastros": FolderPlus,
  "/gestao-rh": Users,
  "/relatorios": FileText,
  "/configuracoes": Settings,
  "/comissoes": ClipboardList,
  "/perfil": User,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavItemProps {
  item: MenuItem;
  isActive: boolean;
  index: number;
}

function NavItem({ item, isActive: active, index }: NavItemProps) {
  const Icon = iconMap[item.href];
  
  const content = (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "transition-all duration-200 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "bg-accent text-accent-foreground shadow-md dark:shadow-[var(--glow-primary)]"
          : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground hover:shadow-sm",
        "animate-fade-in-up fill-both"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {active && (
        <span 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-success animate-fade-in-scale"
          aria-hidden="true"
        />
      )}
      
      <span className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
        active
          ? "bg-accent-foreground/10"
          : "bg-muted/50 group-hover:bg-accent/30 group-hover:scale-110"
      )}>
        {Icon && (
          <Icon className={cn(
            "h-4 w-4 transition-transform duration-200",
            active && "text-accent-foreground",
            !active && "group-hover:scale-110"
          )} />
        )}
      </span>
      
      <span className="flex-1 truncate">{item.label}</span>
      
      {item.isNew && (
        <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success animate-pulse-soft">
          <Sparkles className="h-3 w-3" />
          Novo
        </span>
      )}
      
      {item.badge && !item.isNew && (
        <span className={cn(
          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
          "bg-primary text-primary-foreground",
          "animate-fade-in-scale"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="hidden lg:block">
          <p>{item.label}</p>
          {item.isNew && <p className="text-xs text-success">Nova funcionalidade</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SidebarNavGroupProps {
  group: MenuGroup;
  pathname: string;
  startIndex: number;
}

function SidebarNavGroup({ group, pathname, startIndex }: SidebarNavGroupProps) {
  return (
    <div className="space-y-1">
      {group.label && (
        <div className="px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </span>
        </div>
      )}
      {group.items.map((item, index) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={!item.external && isActive(pathname, item.href)}
          index={startIndex + index}
        />
      ))}
    </div>
  );
}

export function SidebarNav({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  
  const groups: MenuGroup[] = [
    {
      label: "Principal",
      items: menu.filter(item => 
        ["/dashboard", "/venda-rapida", "/historico"].includes(item.href)
      ),
    },
    {
      label: "Gestão",
      items: menu.filter(item => 
        ["/financeiro", "/prudent", "/cadastros", "/gestao-rh"].includes(item.href)
      ),
    },
    {
      label: "Ferramentas",
      items: menu.filter(item => 
        ["/inteligencia", "/importacao", "/relatorios", "/comissoes"].includes(item.href)
      ),
    },
    {
      label: "Sistema",
      items: menu.filter(item => 
        ["/configuracoes", "/perfil"].includes(item.href)
      ),
    },
  ].filter(group => group.items.length > 0);

  let itemIndex = 0;

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto custom-scrollbar">
      {groups.map((group, groupIndex) => {
        const startIndex = itemIndex;
        itemIndex += group.items.length;
        return (
          <SidebarNavGroup
            key={groupIndex}
            group={group}
            pathname={pathname}
            startIndex={startIndex}
          />
        );
      })}
    </nav>
  );
}

export function SidebarNavSimple({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {menu.map((item, index) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={!item.external && isActive(pathname, item.href)}
          index={index}
        />
      ))}
    </nav>
  );
}
