"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Brain,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  FolderPlus,
  History,
  Home,
  MessagesSquare,
  ReceiptText,
  Settings,
  ShoppingCart,
  Upload,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { menuDoPerfil, type ChaveIcone, type ItemMenu } from "@/lib/menu";

// Chave de ícone (do módulo puro `lib/menu.ts`) -> componente lucide. O `Record` completo faz o
// TypeScript reprovar uma chave nova sem ícone. O agrupamento e os itens vêm TODOS de
// `menuDoPerfil`: a cópia local que existia aqui foi o que fez o /crm sumir uma vez.
const ICONES: Record<ChaveIcone, LucideIcon> = {
  inicio: Home,
  venda: ShoppingCart,
  historico: History,
  importacao: Upload,
  financeiro: Wallet,
  boletos: ReceiptText,
  prudent: Banknote,
  obrigacoes: CalendarClock,
  fechamento: CalendarCheck,
  ia: Brain,
  crm: MessagesSquare,
  relatorios: FileText,
  cadastros: FolderPlus,
  rh: Users,
  configuracoes: Settings,
  comissoes: ClipboardList,
  perfil: User,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavItemProps {
  item: ItemMenu;
  isActive: boolean;
  /** Contador à direita (ex.: assinaturas pendentes no Histórico). Zero/ausente não desenha nada. */
  contagem?: number;
  /** Destino do link quando difere de `item.href` (o contador e o destino são o mesmo conjunto). */
  href?: string;
}

function NavItem({ item, isActive: active, contagem, href }: NavItemProps) {
  const Icon = ICONES[item.icone];

  return (
    <Link
      href={href ?? item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // 44px de altura (alvo de toque), raio de controle, transição pelo token --mov-nav.
        "group relative flex min-h-11 items-center gap-3 rounded-controle px-3 text-sm",
        "transition-[background-color,color] duration-[var(--mov-nav)] ease-out motion-reduce:transition-none",
        // Anel verde da marca no foco por teclado, com folga na cor do painel.
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        // Ativo: no escuro o degrau `controle-ativo` com texto foreground (artboard Main); no claro
        // o `--controle-ativo` é branco e sumiria sobre o painel branco, então o artboard
        // InicioClaro usa o tint da marca com o texto verde. Hover usa o accent OPACO.
        active
          ? "bg-marca-tint font-semibold text-marca-tint-texto dark:bg-controle-ativo dark:text-foreground"
          : "font-medium text-texto-secundario hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>

      {item.isNew && (
        <span className="flex h-[22px] items-center rounded-full bg-marca-tint text-marca-tint-texto px-2 text-xs font-semibold">
          Novo
        </span>
      )}

      {contagem !== undefined && contagem > 0 && (
        // Par neutro (não o preenchimento da marca): o número informa, não chama. Mono para os
        // dígitos não dançarem. O `sr-only` dá o contexto que o número solto não tem.
        <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-divisoria px-1.5 font-mono text-xs text-texto-secundario">
          {contagem}
          <span className="sr-only"> pendentes</span>
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({
  role,
  contagens,
  links,
}: {
  role: string;
  /** Contadores por href, ex.: `{ "/historico": 82 }`. Calculados UMA vez no layout. */
  contagens?: Partial<Record<string, number>>;
  /** Destino do link por href do item, ex.: o Histórico já filtrado em "pendentes" (a URL do contador). */
  links?: Partial<Record<string, string>>;
}) {
  const pathname = usePathname();
  const grupos = menuDoPerfil(role);

  return (
    <nav
      aria-label="Menu principal"
      className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
    >
      {grupos.map((grupo) => (
        <div key={grupo.label} className="flex flex-col gap-0.5">
          {/* Rótulo do grupo: token muted opaco, sem opacidade parcial (o `/80` media 4.17:1). */}
          <span className="px-3 pb-1.5 text-xs font-medium text-sidebar-muted">{grupo.label}</span>
          {grupo.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive(pathname, item.href)}
              contagem={contagens?.[item.href]}
              href={links?.[item.href]}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
