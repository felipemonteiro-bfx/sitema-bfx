"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  external?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  const icons: Record<string, React.ReactNode> = {
    "/dashboard": <BarChart3 className="h-4 w-4" />,
    "/financeiro": <Wallet className="h-4 w-4" />,
    "/prudent": <ReceiptText className="h-4 w-4" />,
    "/inteligencia": <Brain className="h-4 w-4" />,
    "/importacao": <Upload className="h-4 w-4" />,
    "/venda-rapida": <ShoppingCart className="h-4 w-4" />,
    "/historico": <History className="h-4 w-4" />,
    "/cadastros": <FolderPlus className="h-4 w-4" />,
    "/gestao-rh": <Users className="h-4 w-4" />,
    "/relatorios": <FileText className="h-4 w-4" />,
    "/configuracoes": <Settings className="h-4 w-4" />,
    "/comissoes": <ClipboardList className="h-4 w-4" />,
    "/perfil": <User className="h-4 w-4" />,
  };

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {menu.map((item) => {
        const active = !item.external && isActive(pathname, item.href);
        const className = active
          ? "justify-start gap-2 rounded-lg bg-muted text-foreground shadow-sm hover:bg-muted"
          : "justify-start gap-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground";

        const icon = icons[item.href];
        return item.external ? (
          <Button key={item.href} variant="ghost" className={className} asChild>
            <a href={item.href} target="_blank" rel="noreferrer">
              {icon}
              {item.label}
            </a>
          </Button>
        ) : (
          <Button
            key={item.href}
            variant="ghost"
            className={className}
            asChild
          >
            <Link href={item.href} aria-current={active ? "page" : undefined}>
              {icon}
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
