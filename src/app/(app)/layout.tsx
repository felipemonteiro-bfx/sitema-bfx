import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileMenuTrigger } from "@/components/mobile-menu-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Sparkles, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

const adminMenu = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/financeiro", label: "Financeiro & DRE" },
  { href: "/prudent", label: "Prudent (Antecipação)" },
  { href: "/inteligencia", label: "BFX Intelligence", isNew: true },
  { href: "/importacao", label: "Importação" },
  { href: "/venda-rapida", label: "Venda Rápida" },
  { href: "/historico", label: "Histórico (Editar)" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/gestao-rh", label: "Gestão de RH" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "Configurações" },
];

const sellerMenu = [
  { href: "/venda-rapida", label: "Venda Rápida" },
  { href: "/comissoes", label: "Minhas Comissões" },
  { href: "/historico", label: "Histórico (Editar)" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/relatorios", label: "Relatórios PDF" },
  { href: "/perfil", label: "Meu Perfil" },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const menu = session.role === "admin" ? adminMenu : sellerMenu;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-3 py-5 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:flex animate-slide-in-left">
          <div className="sticky top-5 h-[calc(100vh-2.5rem)] w-full rounded-2xl border border-border bg-card px-5 py-6 text-card-foreground shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl dark:shadow-[var(--shadow-lg)] dark:hover:shadow-[var(--glow-card)]">
            <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} role={session.role} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-4 py-5 shadow-lg backdrop-blur-sm transition-all duration-300 dark:shadow-[var(--shadow-md)] lg:px-8 lg:py-7 animate-fade-in">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3">
              <MobileMenuTrigger>
                <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} role={session.role} />
              </MobileMenuTrigger>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {session.nomeExibicao || session.username}
                </span>
                <Badge variant={session.role === "admin" ? "info" : "secondary"} size="sm">
                  {session.role === "admin" ? "Admin" : "Vendedor"}
                </Badge>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  menu,
  userLabel,
  role,
}: {
  menu: { href: string; label: string; external?: boolean; isNew?: boolean }[];
  userLabel: string;
  role?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
                BFX Manager
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{userLabel}</span>
            <Badge variant={role === "admin" ? "info" : "secondary"} size="sm">
              {role === "admin" ? "Admin" : "Vendedor"}
            </Badge>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <Separator className="my-5" />
      <SidebarNav menu={menu} />
      <div className="mt-auto">
        <Separator className="my-4" />
        <LogoutButton />
      </div>
    </div>
  );
}
