"use client";

/**
 * Paleta de busca (⌘K / Ctrl+K) do redesign Vantage.
 *
 * Como montar (tarefa F3): `<BuscaRapida role={session.role} />` UMA vez na casca (layout de
 * (app)); ele registra o único listener de teclado. Qualquer botão da casca abre a paleta
 * com `<BuscaRapidaGatilho />` (dispara `EVENTO_ABRIR_BUSCA` na janela; não há contexto).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  FolderPlus,
  History,
  Home,
  Brain,
  Lock,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Upload,
  User,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, formatBRL } from "@/lib/utils";
import { menuDoPerfil } from "@/lib/menu";
import {
  EVENTO_ABRIR_BUSCA,
  detectarPlataforma,
  montarGrupos,
  teclaAbreBusca,
  type ItemBusca,
  type Plataforma,
  type RespostaBusca,
} from "@/lib/busca-rapida-ui";

const DEBOUNCE_MS = 200;

const ICONES: Record<string, LucideIcon> = {
  inicio: Home,
  venda: ShoppingCart,
  historico: History,
  importacao: Upload,
  financeiro: Wallet,
  boletos: Receipt,
  prudent: CalendarClock,
  obrigacoes: ClipboardList,
  fechamento: CalendarCheck,
  ia: Brain,
  crm: Users,
  relatorios: FileText,
  cadastros: FolderPlus,
  rh: Users,
  configuracoes: Settings,
  comissoes: Wallet,
  perfil: User,
  raio: Sparkles,
  assinatura: Clock,
  cadeado: Lock,
};

/** "2026-10-05" -> "05/10" (data pura, sem fuso). */
function diaMes(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function IconeStatus({ status }: { status: ItemBusca["statusAssinatura"] }) {
  if (status === "assinado") {
    return (
      <>
        <CircleCheck className="h-5 w-5 shrink-0 text-success-text" aria-hidden="true" />
        <span className="sr-only">Assinada.</span>
      </>
    );
  }
  if (status === "pendente") {
    return (
      <>
        <Clock className="h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
        <span className="sr-only">Aguardando assinatura.</span>
      </>
    );
  }
  return <Zap className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-controle px-1.5 font-mono text-xs text-muted-foreground dark:bg-controle-ativo",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function BuscaRapida({ role, urlPendentes }: { role: string; urlPendentes?: string }) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [texto, setTexto] = React.useState("");
  const [resposta, setResposta] = React.useState<RespostaBusca | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState(false);
  const plataforma = React.useRef<Plataforma>("outra");
  // Elemento focado antes de abrir. O Content do Radix sem `Trigger` não devolve o
  // foco sozinho (fica no body depois do Esc), então guardamos e devolvemos à mão.
  const origemFoco = React.useRef<HTMLElement | null>(null);

  // Único listener global de teclado. `navigator` só existe no cliente, por isso o efeito.
  React.useEffect(() => {
    plataforma.current = detectarPlataforma(navigator);
    function guardarOrigem() {
      const atual = document.activeElement;
      // Com a busca aberta o foco está dentro do diálogo: não sobrescreve a origem.
      if (atual instanceof HTMLElement && !atual.closest("[role=dialog]")) origemFoco.current = atual;
    }
    function aoTeclar(e: KeyboardEvent) {
      if (!teclaAbreBusca(e, plataforma.current)) return;
      e.preventDefault();
      guardarOrigem();
      setAberto((a) => !a);
    }
    function aoPedirAbertura() {
      guardarOrigem();
      setAberto(true);
    }
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener(EVENTO_ABRIR_BUSCA, aoPedirAbertura);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener(EVENTO_ABRIR_BUSCA, aoPedirAbertura);
    };
  }, []);

  // Ao fechar, limpa tudo: a próxima abertura começa no estado vazio.
  React.useEffect(() => {
    if (aberto) return;
    setTexto("");
    setResposta(null);
    setCarregando(false);
    setErro(false);
  }, [aberto]);

  // Busca no servidor: debounce de 200ms e cancelamento da requisição anterior.
  React.useEffect(() => {
    const consulta = texto.trim();
    if (!aberto) return;
    if (!consulta) {
      setResposta(null);
      setCarregando(false);
      setErro(false);
      return;
    }
    const controle = new AbortController();
    setCarregando(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/busca-rapida?q=${encodeURIComponent(consulta)}`, {
          signal: controle.signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error(String(r.status));
        setResposta((await r.json()) as RespostaBusca);
        setErro(false);
      } catch (e) {
        if (controle.signal.aborted) return;
        void e;
        setErro(true);
      } finally {
        if (!controle.signal.aborted) setCarregando(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controle.abort();
    };
  }, [texto, aberto]);

  const menu = React.useMemo(() => menuDoPerfil(role), [role]);
  const { grupos, perguntarIA } = React.useMemo(
    () => montarGrupos(resposta, menu, role, texto, urlPendentes),
    [resposta, menu, role, texto, urlPendentes],
  );

  function abrir(url: string) {
    setAberto(false);
    router.push(url);
  }

  const semResultado = Boolean(texto.trim()) && !carregando && !erro && grupos.length === 0;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby="busca-rapida-descricao"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            origemFoco.current?.focus();
          }}
          className={cn(
            "fixed left-1/2 top-[8vh] z-[9999] w-[calc(100vw-2rem)] max-w-[760px] -translate-x-1/2 overflow-hidden rounded-painel border border-divisoria bg-popover shadow-lg dark:shadow-[var(--shadow-lg)]",
            // Abertura: opacity + scale .98 -> 1 em 180ms na curva do redesign.
            "duration-[180ms] ease-[var(--mov-curva)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none",
          )}
        >
          <DialogTitle className="sr-only">Busca rápida</DialogTitle>
          <DialogDescription id="busca-rapida-descricao" className="sr-only">
            Busque vendas, clientes, páginas e ações. Use as setas para navegar e Enter para abrir.
          </DialogDescription>

          <Command shouldFilter={false} loop label="Busca rápida">
            <div className="relative border-b border-divisoria">
              <div className="flex items-center">
                <div className="min-w-0 flex-1">
                  <CommandInput
                    value={texto}
                    onValueChange={setTexto}
                    placeholder="Buscar venda, cliente, página…"
                    aria-label="Buscar"
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>
                <DialogPrimitive.Close
                  aria-label="Fechar busca"
                  className="mr-3 inline-flex h-11 min-w-11 items-center justify-center rounded-lg font-mono text-xs text-muted-foreground hover:bg-controle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mr-5 sm:h-8 sm:min-w-0 sm:bg-controle sm:px-2.5 dark:sm:bg-controle-ativo"
                >
                  esc
                </DialogPrimitive.Close>
              </div>
              {/* Faixa fixa de 2px: indica busca em andamento sem mexer no layout. */}
              <div
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 bottom-[-1px] h-0.5 origin-left bg-primary transition-opacity duration-150",
                  carregando ? "opacity-100" : "opacity-0",
                )}
              />
            </div>

            <CommandList aria-busy={carregando} className={cn(carregando && resposta && "opacity-70 transition-opacity")}>
              {erro && (
                <p role="alert" className="px-5 py-8 text-center text-sm text-error-text">
                  Não foi possível buscar agora. Tente de novo.
                </p>
              )}
              {semResultado && (
                <p role="status" className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nada encontrado para “{texto.trim()}”.
                </p>
              )}
              {!erro &&
                grupos.map((g) => (
                  <CommandGroup
                    key={g.id}
                    heading={
                      g.id === "sugestao" ? undefined : (
                        <>
                          <span>{g.titulo}</span>
                          {g.contador && <span className="font-mono">{g.contador}</span>}
                        </>
                      )
                    }
                  >
                    {g.itens.map((item) => (
                      <LinhaItem key={item.chave} grupo={g.id} item={item} aoAbrir={abrir} />
                    ))}
                  </CommandGroup>
                ))}
            </CommandList>

            <div className="flex min-h-14 items-center gap-5 border-t border-divisoria px-4 py-1 text-sm text-muted-foreground sm:px-5">
              <span className="hidden items-center gap-2 sm:flex">
                <Kbd>↑↓</Kbd>navegar
              </span>
              <span className="hidden items-center gap-2 sm:flex">
                <Kbd>↵</Kbd>abrir
              </span>
              {perguntarIA && (
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto h-11 gap-2 px-3 text-foreground"
                  onClick={() => abrir(perguntarIA)}
                >
                  <Sparkles className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
                  Perguntar ao BFX Intelligence
                </Button>
              )}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function LinhaItem({
  grupo,
  item,
  aoAbrir,
}: {
  grupo: string;
  item: ItemBusca;
  aoAbrir: (url: string) => void;
}) {
  const Icone = item.icone ? ICONES[item.icone] : undefined;
  const aoSelecionar = () => aoAbrir(item.url);

  if (grupo === "sugestao") {
    return (
      <CommandItem value={item.chave} onSelect={aoSelecionar} className="min-h-[4.5rem] gap-4">
        <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{item.rotulo}</span>
          {item.detalhe && <span className="truncate text-sm text-muted-foreground">{item.detalhe}</span>}
        </span>
        <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          Abrir <Kbd>↵</Kbd>
        </span>
      </CommandItem>
    );
  }

  if (grupo === "vendas") {
    return (
      <CommandItem value={item.chave} onSelect={aoSelecionar}>
        <IconeStatus status={item.statusAssinatura ?? null} />
        <span className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="truncate">{item.rotulo}</span>
          <span className="font-mono text-sm text-muted-foreground">{item.codigo}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end text-sm text-muted-foreground sm:flex-row sm:gap-2">
          <span className="valor-sensivel tabular-nums">{formatBRL(item.valor)}</span>
          {item.data && (
            <span className="tabular-nums">
              <span aria-hidden="true" className="hidden sm:inline">
                ·{" "}
              </span>
              {diaMes(item.data)}
            </span>
          )}
        </span>
      </CommandItem>
    );
  }

  if (grupo === "clientes") {
    return (
      <CommandItem value={item.chave} onSelect={aoSelecionar}>
        <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{item.rotulo}</span>
      </CommandItem>
    );
  }

  return (
    <CommandItem value={item.chave} onSelect={aoSelecionar}>
      {Icone && <Icone className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span className="truncate">{item.rotulo}</span>
    </CommandItem>
  );
}

/**
 * Botão em forma de campo que abre a paleta. Dispara `EVENTO_ABRIR_BUSCA`; o `<BuscaRapida>`
 * montado na casca escuta. Ao fechar, o Radix devolve o foco a este botão (era o elemento
 * focado na abertura).
 */
export function BuscaRapidaGatilho({ className }: { className?: string }) {
  // Renderiza "Ctrl K" no servidor e corrige para "⌘K" no cliente após hidratar.
  const [plataforma, setPlataforma] = React.useState<Plataforma>("outra");
  React.useEffect(() => {
    setPlataforma(detectarPlataforma(navigator));
  }, []);

  return (
    <Button
      type="button"
      variant="ghost"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA))}
      className={cn(
        "h-11 w-full justify-start gap-2.5 rounded-controle bg-controle px-3 font-normal text-muted-foreground hover:bg-controle-ativo hover:text-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">Buscar venda, cliente, página</span>
      <kbd className="inline-flex h-6 items-center rounded-md bg-controle-ativo px-1.5 font-mono text-xs text-muted-foreground dark:bg-controle">
        {plataforma === "mac" ? "⌘K" : "Ctrl K"}
      </kbd>
    </Button>
  );
}
