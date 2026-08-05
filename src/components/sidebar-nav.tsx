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
  Home,
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
  "/dashboard": Home,
  "/boletos": ReceiptText,
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
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
        // O hover usa o accent OPACO, nao `/80`: o composto muda de cor com o
        // fundo por baixo e nao e mensuravel pela catraca — o par medido
        // precisa ser o par renderizado.
        active
          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] shadow-md"
          : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
        "animate-fade-in-up fill-both"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {active && (
        <span 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[var(--sidebar-primary)] animate-fade-in-scale"
          aria-hidden="true"
        />
      )}
      
      {/* Tint OPACO (`--sidebar-primary-bg`) no lugar do composto
          `--sidebar-primary/20`: o composto escurece o proprio tom e nao e
          mensuravel. E `bg-white/5` no estado inativo era literalmente
          invisivel sobre fundo claro — virou `--sidebar-accent`. */}
      <span className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        active
          ? "bg-[var(--sidebar-primary-bg)]"
          : "bg-[var(--sidebar-accent)] group-hover:bg-[var(--sidebar-primary-bg)] group-hover:scale-105"
      )}>
        {Icon && (
          <Icon className={cn(
            "h-4 w-4 transition-transform duration-200",
            active && "text-[var(--sidebar-primary)]",
            !active && "group-hover:scale-105"
          )} />
        )}
      </span>
      
      <span className="flex-1 truncate">{item.label}</span>
      
      {item.isNew && (
        <span className="flex items-center gap-1 rounded-full bg-[var(--sidebar-primary-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-primary)] animate-pulse-soft">
          <Sparkles className="h-3 w-3" />
          Novo
        </span>
      )}
      
      {item.badge && !item.isNew && (
        // `text-white` cru sobre um preenchimento que muda de tema dava
        // 3.41:1 (claro) e 3.15:1 (escuro). O par de tokens fecha nos dois:
        // 6.25:1 e 6.03:1 — `--sidebar-primary-foreground` INVERTE.
        <span className={cn(
          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
          "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]",
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
          {/* O `TooltipContent` desenha sobre `bg-primary`, que INVERTE entre os
              temas (0.145 no claro, 0.985 no escuro). Nenhum token semantico
              serve nos dois: o token de preenchimento dava 6.54 no claro mas
              2.37 no escuro, e a variante de texto daria 3.75 / 2.37. Quem
              fecha nos dois lados e o par do proprio tooltip —
              `text-primary-foreground`, 18.93:1. O destaque fica no peso da
              fonte, nao na matiz. */}
          {item.isNew && <p className="text-xs font-semibold text-primary-foreground">Nova funcionalidade</p>}
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
          {/* Sem `/80`: a opacidade parcial derrubava o rotulo de grupo para
              4.17:1 no escuro — a catraca aprovava o token e a tela reprovava
              o pixel. Em 10px isso e exatamente onde nao da para ceder. */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
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
  
  const baseGroups: MenuGroup[] = [
    {
      label: "Visão geral",
      items: menu.filter(item => ["/dashboard"].includes(item.href)),
    },
    {
      label: "Vendas & Operações",
      items: menu.filter(item =>
        ["/venda-rapida", "/historico", "/importacao"].includes(item.href)
      ),
    },
    {
      label: "Financeiro",
      items: menu.filter(item =>
        ["/financeiro", "/boletos", "/prudent"].includes(item.href)
      ),
    },
    {
      label: "Inteligência & Dados",
      items: menu.filter(item =>
        ["/inteligencia", "/crm", "/relatorios", "/cadastros", "/gestao-rh", "/comissoes"].includes(item.href)
      ),
    },
    {
      label: "Sistema",
      items: menu.filter(item =>
        ["/configuracoes", "/perfil"].includes(item.href)
      ),
    },
  ];

  // Rede de seguranca: qualquer item do menu que nao caiu em nenhum grupo acima
  // (ex.: rota nova adicionada em layout.tsx mas esquecida aqui) vai para "Outros"
  // em vez de sumir silenciosamente do sidebar. Foi o que aconteceu com /crm.
  const agrupados = new Set(baseGroups.flatMap(g => g.items.map(i => i.href)));
  const semGrupo = menu.filter(item => !agrupados.has(item.href));

  const groups: MenuGroup[] = [
    ...baseGroups,
    { label: "Outros", items: semGrupo },
  ].filter(group => group.items.length > 0);

  let itemIndex = 0;

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto custom-scrollbar">
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
