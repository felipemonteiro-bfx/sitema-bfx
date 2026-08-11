import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileMenuTrigger } from "@/components/mobile-menu-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

const adminMenu = [
  { href: "/dashboard", label: "Início" },
  { href: "/venda-rapida", label: "Venda Rápida" },
  { href: "/historico", label: "Histórico" },
  { href: "/importacao", label: "Importação" },
  { href: "/financeiro", label: "Financeiro & DRE" },
  { href: "/boletos", label: "Boletos" },
  { href: "/prudent", label: "Prudent (Antecipação)" },
  { href: "/inteligencia", label: "BFX Intelligence", isNew: true },
  { href: "/crm", label: "CRM", isNew: true },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/gestao-rh", label: "Gestão de RH" },
  { href: "/configuracoes", label: "Configurações" },
];

const sellerMenu = [
  { href: "/dashboard", label: "Início" },
  { href: "/venda-rapida", label: "Venda Rápida" },
  { href: "/comissoes", label: "Minhas Comissões" },
  { href: "/historico", label: "Histórico" },
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
          {/* Sem `.sidebar-dark`: aquela classe fixava `color-scheme: dark` no
              painel. Agora que a sidebar acompanha o tema, o `color-scheme`
              fixo pintaria a barra de rolagem e os controles nativos de escuro
              dentro de uma superficie clara. Herdar do documento ja da o certo
              nos dois temas. */}
          {/* `border-border`, a MESMA do <main> ao lado, e nao
              `border-sidebar-border`. Os dois paineis ficam lado a lado sobre
              `--background`: com a sidebar clara (0.965) contra a pagina
              (0.985), `--sidebar-border` dava 1.79:1 e o painel praticamente
              perdia o contorno enquanto o vizinho mantinha o dele a 3.49:1.
              `--sidebar-border` continua sendo o separador INTERNO, onde uma
              linha discreta e o que se quer. */}
          <div className="sticky top-5 h-[calc(100vh-2.5rem)] w-full rounded-2xl border border-border bg-[var(--sidebar)] px-5 py-6 text-[var(--sidebar-foreground)] shadow-xl transition-all duration-300">
            <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} role={session.role} />
          </div>
        </aside>
        <main className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-4 py-5 shadow-lg backdrop-blur-sm transition-all duration-300 dark:shadow-[var(--shadow-md)] lg:px-8 lg:py-7 animate-fade-in">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <MobileMenuTrigger>
                <SidebarContent menu={menu} userLabel={session.nomeExibicao || session.username} role={session.role} />
              </MobileMenuTrigger>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                  {session.nomeExibicao || session.username}
                </span>
                {/* infoSolid, nao info: no mobile este e' o unico badge "Admin"
                    visivel (o da sidebar fica oculto) e o info translucido
                    media 3.63:1 no tema claro, abaixo dos 4.5:1 com 10px. */}
                <Badge variant={session.role === "admin" ? "infoSolid" : "secondary"} size="sm">
                  {session.role === "admin" ? "Admin" : "Vendedor"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* O simbolo da marca e desacoplado da paleta da sidebar: o
                gradiente `--gradient-cta-*` e decorativo e identico nos dois
                temas, entao o chip continua igual enquanto a sidebar inverte.
                Antes o inicio do gradiente era `--sidebar-primary`, que agora
                escurece no tema claro (ele virou cor de TEXTO da marca) — o
                logo teria mudado de cor de brinde. O icone usa o token do
                gradiente, nao `text-white` cru: 5.05:1 no extremo claro e
                8.65:1 no escuro do degrade (verde da marca). */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gradient-cta-from to-gradient-cta-to shadow-md">
              <LayoutDashboard className="h-4 w-4 text-gradient-cta-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--sidebar-foreground)]">
                BFX Manager
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--sidebar-muted)]">{userLabel}</span>
            {/* infoSolid (não "info" translúcido): a variante sólida traz o próprio
                preenchimento (`bg-info` + `text-info-foreground`, 5.37:1), então não
                depende do que está atrás. É justamente por isso que ela sobrevive à
                sidebar passar a acompanhar o tema — a variante translúcida "info"
                mede o contraste CONTRA o fundo (4.39:1 sobre a sidebar escura) e teria
                de ser recalibrada de novo agora que esse fundo inverte. */}
            <Badge variant={role === "admin" ? "infoSolid" : "secondary"} size="sm">
              {role === "admin" ? "Admin" : "Vendedor"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
      <Separator className="my-5 bg-[var(--sidebar-border)]" />
      <SidebarNav menu={menu} />
      <div className="mt-auto">
        <Separator className="my-4 bg-[var(--sidebar-border)]" />
        <LogoutButton />
      </div>
    </div>
  );
}
