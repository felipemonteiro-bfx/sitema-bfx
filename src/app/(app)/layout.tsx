import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { getSession } from "@/lib/session";
import { urlPendentesDoUsuario } from "@/lib/historico-filtros";
import { carregarAlertasShell, type AlertasShell } from "@/lib/alertas-shell";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/sidebar-nav";
import { AlertasHoje } from "@/components/alertas-hoje";
import { BuscaRapida, BuscaRapidaGatilho } from "@/components/busca-rapida";
import { BotaoBuscaMobile, MobileMenuTrigger } from "@/components/mobile-menu-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { ValoresToggle } from "@/components/valores-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userLabel = session.nomeExibicao || session.username;

  // Contadores da sidebar: UMA consulta por requisição. O `SidebarContent` é montado duas vezes
  // (aside do desktop e folha do mobile) e recebe o resultado por prop — nunca consulta sozinho.
  // Falha do banco não derruba a casca: sem alertas a sidebar só fica sem os números.
  let alertas: AlertasShell | undefined;
  try {
    alertas = await carregarAlertasShell(session);
  } catch {
    alertas = undefined;
  }
  // Destino ÚNICO do contador de pendentes (alertas, item Histórico e ⌘K): mesmo conjunto contado.
  const urlPendentes = urlPendentesDoUsuario(session);
  // Vendedor recebe só o contador de assinaturas no Histórico; o bloco "Alertas de hoje" é do admin.
  const alertasDoBloco = session.role === "admin" ? alertas : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Paleta ⌘K: UMA instância (um só listener de teclado). O `SidebarContent` é montado duas
          vezes, por isso ela não mora nele; gatilhos disparam `EVENTO_ABRIR_BUSCA`. */}
      <BuscaRapida role={session.role} urlPendentes={urlPendentes} />
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 p-3 lg:p-4">
        <aside className="hidden w-65 shrink-0 lg:flex">
          {/* Painel dos artboards: `bg-card` (degrau acima da página), raio de painel e contorno
              decorativo `--painel-borda`. Sem sombra pesada: a separação vem do degrau de cor. */}
          <div className="sticky top-4 h-[calc(100vh-2rem)] w-full overflow-hidden rounded-painel border border-painel-borda bg-card px-4 py-5 text-foreground">
            <SidebarContent
              userLabel={userLabel}
              role={session.role}
              alertas={alertasDoBloco}
              contagens={{ "/historico": alertas?.assinaturasPendentes }}
              links={{ "/historico": urlPendentes }}
              urlPendentes={urlPendentes}
              busca={<BuscaRapidaGatilho />}
            />
          </div>
        </aside>
        {/* A casca: um degrau abaixo do painel, com o contorno `--shell-borda`. */}
        <main className="min-w-0 flex-1 rounded-shell bg-shell border border-shell-borda px-4 py-5 lg:px-10 lg:py-7">
          {/* Desktop: sino e olho do modo discreto flutuam no canto superior direito da casca, SEM
              linha própria. O float faz o cabeçalho da página contornar os dois botões (o flex do
              PageHeader é um BFC e encolhe ao lado dele), então as ações da página nunca ficam
              por baixo; abaixo do cabeçalho o conteúdo volta à largura inteira. */}
          <div className="hidden lg:float-right lg:ml-3 lg:flex lg:items-center lg:gap-2">
            <NotificationBell />
            <ValoresToggle />
          </div>
          {/* Celular: gatilho do menu + quem está logado à esquerda; busca, sino e olho à direita.
              Nome e perfil já estão na sidebar do desktop. */}
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <MobileMenuTrigger>
                <SidebarContent
                  userLabel={userLabel}
                  role={session.role}
                  alertas={alertasDoBloco}
                  contagens={{ "/historico": alertas?.assinaturasPendentes }}
                  links={{ "/historico": urlPendentes }}
                  urlPendentes={urlPendentes}
                />
              </MobileMenuTrigger>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="max-w-[120px] truncate text-sm font-medium text-foreground sm:max-w-[160px]">
                  {userLabel}
                </span>
                {/* infoSolid, não info: aqui este é o único selo "Admin" visível (o da sidebar
                    fica oculto) e o info translúcido não fecha 4.5:1 no tema claro. */}
                <Badge variant={session.role === "admin" ? "infoSolid" : "secondary"} size="sm">
                  {session.role === "admin" ? "Admin" : "Vendedor"}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BotaoBuscaMobile />
              <NotificationBell />
              <ValoresToggle />
            </div>
          </div>
          <div className="anim-entrada">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  userLabel,
  role,
  alertas,
  contagens,
  links,
  urlPendentes,
  busca,
}: {
  userLabel: string;
  role: string;
  /** Só admin. Vem pronto do layout (que consulta uma vez). */
  alertas?: AlertasShell;
  /** Contadores por href (ex.: Histórico = assinaturas pendentes). */
  contagens?: Partial<Record<string, number>>;
  /** Destino do link por href (o Histórico aponta para a URL do contador). */
  links?: Partial<Record<string, string>>;
  /** URL única de assinaturas pendentes, para o bloco de alertas. */
  urlPendentes: string;
  /** Gatilho da busca global; só a sidebar do desktop o recebe (no celular é o botão da lupa). */
  busca?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex items-center gap-3 px-1">
        {/* Chip da marca no verde primário, ícone no par `primary-foreground`. */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-controle bg-primary">
          <LayoutDashboard className="h-[18px] w-[18px] text-primary-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight text-foreground">BFX Manager</p>
          <p className="truncate text-xs text-sidebar-muted">
            {userLabel} · {role === "admin" ? "Admin" : "Vendedor"}
          </p>
        </div>
      </div>
      {busca}
      <SidebarNav role={role} contagens={contagens} links={links} />
      <AlertasHoje alertas={alertas} urlAssinaturas={urlPendentes} />
      <div className="flex items-center gap-2 border-t border-divisoria pt-4">
        <div className="min-w-0 flex-1">
          <LogoutButton />
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
