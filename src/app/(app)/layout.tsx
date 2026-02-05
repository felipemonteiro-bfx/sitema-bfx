import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileMenuTrigger } from "@/components/mobile-menu-trigger";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

const adminMenu = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/financeiro", label: "Financeiro & DRE" },
  { href: "/prudent", label: "Prudent (Antecipação)" },
  { href: "/inteligencia", label: "BFX Intelligence" },
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
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-3 py-5 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:flex">
          <div className="sticky top-5 h-[calc(100vh-2.5rem)] w-full rounded-2xl border bg-card/90 px-5 py-6 text-card-foreground shadow-sm">
            <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 rounded-2xl border bg-card/80 px-4 py-5 shadow-sm backdrop-blur lg:px-8 lg:py-7">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3">
              <MobileMenuTrigger>
                <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} />
              </MobileMenuTrigger>
              <div className="text-sm text-muted-foreground">
                {session.nomeExibicao || session.username}
              </div>
            </div>
            <ThemeToggle />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  menu,
  userLabel,
}: {
  menu: { href: string; label: string; external?: boolean }[];
  userLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">BFX Manager</h1>
          <div className="text-sm text-muted-foreground">{userLabel}</div>
        </div>
        <ThemeToggle />
      </div>
      <Separator className="my-4" />
      <SidebarNav menu={menu} />
      <Separator className="my-4" />
      <LogoutButton />
    </div>
  );
}
