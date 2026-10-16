import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Esqueletos no layout do Vantage: PageHeader -> painel (`Card`) -> poço/card interno.
// O bloco é neutro (`divisoria`, o cinza decorativo do tema), de cor chapada, e só pulsa;
// a pulsação some com prefers-reduced-motion.
//
// Regra de ouro: o esqueleto reproduz a ordem, a quantidade e a ALTURA dos blocos da tela real,
// para a página não "pular" (CLS) quando o conteúdo chega. As alturas abaixo vêm da medição do
// layout real (cabeçalho de 90px, campo de 70px, linha de tabela de 56px, KPI de 128px...).
// Cada `loading.tsx` embrulha tudo em `SkeletonRegiao`, que anuncia "Carregando…" ao leitor de tela.

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse rounded-md bg-divisoria motion-reduce:animate-none max-w-full", className)}
    />
  );
}

/**
 * Raiz de todo esqueleto de tela: região `status` ocupada, com o texto "Carregando…" só para
 * leitor de tela. Os blocos visuais são `aria-hidden`, então este é o único anúncio.
 */
export function SkeletonRegiao({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("space-y-6", className)}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}

/**
 * Cabeçalho da página (`PageHeader`): trilha (20px) + 8px, título (37px), descrição (20px) e as ações
 * à direita. `acoes` aceita um número de botões (44px) ou um nó pronto; `selo` é a pill ao lado do título.
 */
export function SkeletonCabecalho({
  acoes,
  trilha = true,
  descricao = true,
  selo = false,
  tituloLargura = "w-56",
  tituloLinhas = 1,
  descricaoLinhas = 2,
}: {
  acoes?: boolean | number | React.ReactNode;
  trilha?: boolean;
  descricao?: boolean;
  selo?: boolean;
  tituloLargura?: string;
  /** Linhas do título no celular (a 360px os títulos longos quebram em duas). */
  tituloLinhas?: 1 | 2;
  /** Linhas da descrição no celular (de `sm` em diante ela cabe numa só). */
  descricaoLinhas?: 1 | 2 | 3 | 4;
}) {
  const botoes = acoes === true ? 1 : typeof acoes === "number" ? acoes : 0;
  const no = acoes && typeof acoes === "object" ? acoes : null;
  return (
    <div>
      {trilha && (
        <div className="mb-2 flex h-5 items-center">
          <Skeleton className="h-4 w-40" />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 max-w-full">
          <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-2 sm:min-h-[37px]">
            <Skeleton className={cn("h-6 sm:h-7", tituloLargura)} />
            {selo && <Skeleton className="h-8 w-36 rounded-full" />}
          </div>
          {tituloLinhas === 2 && (
            <div className="flex h-7 items-center sm:hidden">
              <Skeleton className="h-6 w-32" />
            </div>
          )}
          {descricao && (
            <div className="mt-1">
              {Array.from({ length: descricaoLinhas }).map((_, i) => (
                <div key={i} className={cn("flex h-5 items-center", i > 0 && "sm:hidden")}>
                  <Skeleton className={cn("h-4", i === 0 ? "w-72" : "w-48")} />
                </div>
              ))}
            </div>
          )}
        </div>
        {botoes > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: botoes }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-32 rounded-controle" />
            ))}
          </div>
        )}
        {no && <div className="min-w-0 max-w-full">{no}</div>}
      </div>
    </div>
  );
}

/** Segmentado de período do Início ("Hoje · 7 dias · Mês · Trimestre") mais o botão Filtros. */
export function SkeletonAcoesPeriodo() {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <SkeletonAbas itens={4} semBorda />
      <Skeleton className="h-11 w-24 rounded-controle" />
    </div>
  );
}

/**
 * Fileira de KPIs: painel com cards internos, na mesma grade do `KpiCard`. `rodape` é o número de
 * linhas do rodapé de cada card (1 = 128px de card, 2 = 148px, 2 com `variacao` = 156px, o do Início).
 */
export function SkeletonKpis({
  quantidade = 4,
  rodape = 1,
  variacao = false,
}: {
  quantidade?: number;
  rodape?: 1 | 2;
  /** Rodapé com a pill de variação (Início): 6px entre as duas linhas. */
  variacao?: boolean;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-interno bg-card-elevated px-5 py-4">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-32" />
          <div className={cn("flex flex-col", variacao && "gap-1.5")}>
            <div className="flex h-5 items-center">
              <Skeleton className="h-4 w-28" />
            </div>
            {rodape === 2 && (
              <div className="flex h-5 items-center">
                <Skeleton className="h-4 w-20" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Painel (`Card`). Dois formatos, como na tela real:
 * - `poco` (padrão): `p-2 pt-5`, título de seção e UM poço dentro (gráfico, tabela, lista);
 * - `plano`: `p-6`, título de seção e os campos direto no painel (formulários).
 * `subtitulo` acrescenta a linha muted de descrição sob o título.
 */
export function SkeletonPainel({
  children,
  tituloLargura = "w-40",
  subtitulo = false,
  plano = false,
  compacto = false,
  semTitulo = false,
  acao = false,
  className,
}: {
  children?: React.ReactNode;
  tituloLargura?: string;
  subtitulo?: boolean;
  plano?: boolean;
  /** Painel plano de `p-5` (formulários densos, como o funil do CRM). Implica `plano`. */
  compacto?: boolean;
  /** Painel de filtros, sem título de seção. */
  semTitulo?: boolean;
  /** Botão ou legenda à direita do título. */
  acao?: boolean;
  className?: string;
}) {
  const titulo = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 max-w-full">
        <div className="flex h-7 items-center">
          <Skeleton className={cn("h-5", tituloLargura)} />
        </div>
        {subtitulo && (
          <div className="mt-1 flex h-5 items-center">
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        )}
      </div>
      {acao && <Skeleton className="h-11 w-32 shrink-0 rounded-controle" />}
    </div>
  );
  if (plano || compacto) {
    return (
      <Card className={cn(compacto ? "p-5" : "p-6", className)}>
        {!semTitulo && <div className="mb-4">{titulo}</div>}
        {children}
      </Card>
    );
  }
  return (
    <Card className={cn("flex flex-col p-2 pt-5", className)}>
      <div className="px-4 pb-4">{titulo}</div>
      <div className="flex-1 rounded-interno bg-poco p-4">{children}</div>
    </Card>
  );
}

/** Linhas de tabela dentro de um poço (cabeçalho de 40px + corpo de linhas de 56px). */
export function SkeletonLinhas({
  linhas = 6,
  colunas = 4,
  compacta = false,
}: {
  linhas?: number;
  colunas?: number;
  /** Linha de 48px (tabelas densas, como a equipe do RH). */
  compacta?: boolean;
}) {
  return (
    <div>
      <div className="flex h-10 items-center gap-4">
        {Array.from({ length: colunas }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-divisoria border-t border-divisoria">
        {Array.from({ length: linhas }).map((_, r) => (
          <div key={r} className={cn("flex items-center gap-4", compacta ? "h-12" : "h-14")}>
            {Array.from({ length: colunas }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Campos de formulário (rótulo de 20px + controle de 44px) em grade, no painel ou num poço. */
export function SkeletonCampos({
  campos = 6,
  colunas = "md:grid-cols-3",
  gap = "gap-4",
}: {
  campos?: number;
  colunas?: string;
  gap?: string;
}) {
  return (
    <div className={cn("grid", gap, colunas)}>
      {Array.from({ length: campos }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-11 w-full rounded-controle" />
        </div>
      ))}
    </div>
  );
}

/** Botão de ação (44px) abaixo/ao lado dos campos. */
export function SkeletonBotao({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 w-36 rounded-controle", className)} />;
}

// Larguras variadas das áreas do CRM/Importação: no celular elas quebram em linhas, como a `nav` real.
const LARGURAS_AREAS = ["w-24", "w-24", "w-32", "w-28", "w-28"];

/**
 * Segmentado (abas) do Vantage: trilho `controle` com itens. `compacto` é o das áreas do CRM e da
 * Importação (itens de 36px, 46px no total); o padrão é o das telas com `QueryTabs` (50px).
 */
export function SkeletonAbas({
  itens = 4,
  compacto = false,
  semBorda = false,
}: {
  itens?: number;
  compacto?: boolean;
  semBorda?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-hidden rounded-controle bg-controle p-1",
        compacto && "flex-wrap",
        !semBorda && "border border-divisoria"
      )}
    >
      {Array.from({ length: itens }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "shrink-0 rounded-lg",
            compacto ? LARGURAS_AREAS[i % LARGURAS_AREAS.length] : semBorda ? "w-20" : "w-24",
            compacto ? "h-9" : "h-10"
          )}
        />
      ))}
    </div>
  );
}

/** Abas coladas no conteúdo (8px), como em Financeiro, Cadastros, Prudent, RH e Configurações. */
export function SkeletonComAbas({ itens = 4, children }: { itens?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <SkeletonAbas itens={itens} />
      {children}
    </div>
  );
}

/** Gráfico de barras num poço, com alturas fixas (nada de Math.random: hidratação estável). */
export function SkeletonGrafico({ altura = "h-48" }: { altura?: string }) {
  const alturas = [45, 70, 55, 85, 60, 95, 75];
  return (
    <div className={cn("flex items-end gap-2 pt-4", altura)}>
      {alturas.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Estado vazio (`EmptyState`): círculo de ícone, título e duas linhas. */
export function SkeletonVazio({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-10", className)}>
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/**
 * Esqueleto do Início (`/dashboard`): cabeçalho com período e Filtros, KPIs com variação, "Evolução
 * mensal", "Raio-X da equipe" + "Top produtos" lado a lado e "Clientes que compraram, mês a mês".
 * O Mural de Avisos fica de fora: só existe quando há aviso publicado.
 */
export function SkeletonDashboard() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho descricao={false} selo tituloLargura="w-56" acoes={<SkeletonAcoesPeriodo />} />
      <SkeletonKpis quantidade={4} rodape={2} variacao />
      <SkeletonPainel tituloLargura="w-44" subtitulo className="min-h-[518px] lg:min-h-[462px]">
        <SkeletonGrafico altura="h-72" />
      </SkeletonPainel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <SkeletonPainel tituloLargura="w-40" className="min-h-[223px]">
          <SkeletonLinhas linhas={1} colunas={4} compacta />
        </SkeletonPainel>
        <SkeletonPainel tituloLargura="w-36" className="min-h-[223px]">
          <SkeletonLinhas linhas={1} colunas={2} compacta />
        </SkeletonPainel>
      </div>
      <SkeletonPainel tituloLargura="w-72" subtitulo className="min-h-[1116px] lg:min-h-[696px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonGrafico altura="h-64" />
          <SkeletonLinhas linhas={6} colunas={4} />
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}

/** Esqueleto genérico das rotas sem `loading.tsx` próprio: cabeçalho e um painel com tabela. */
export function SkeletonGenerico() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-40">
        <SkeletonLinhas linhas={3} colunas={4} />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}

/** Avatar redondo das conversas. */
function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("size-10 shrink-0 rounded-full", className)} />;
}

/** Lista de conversas: título + Lista/Kanban, busca de 44px, chips de etapa e a lista num poço. */
function SkeletonConversas() {
  return (
    <Card className="order-2 flex min-w-0 flex-col gap-3 p-2 pt-4 lg:order-none">
      <div className="flex items-center justify-between gap-2 px-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-32 rounded-controle" />
      </div>
      <Skeleton className="mx-2 h-11 rounded-controle" />
      <div className="flex gap-1.5 overflow-hidden px-2">
        <Skeleton className="h-9 w-16 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
      </div>
      <div className="flex-1 divide-y divide-divisoria overflow-hidden rounded-interno bg-poco py-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <SkeletonAvatar />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-40 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Conversa selecionada: cabeçalho da conversa, log dominante (poço com bolhas) e compositor fino. */
function SkeletonConversa() {
  const bolhas = ["w-3/5", "w-2/5 self-end", "w-1/2", "w-2/3 self-end", "w-2/5"];
  return (
    <Card className="order-1 flex min-h-[32rem] min-w-0 flex-col overflow-hidden lg:order-none lg:min-h-0">
      <div className="flex items-center gap-3 border-b border-divisoria px-4 py-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-7 w-40 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-poco p-5">
        <Skeleton className="h-6 w-16 self-center rounded-full" />
        {bolhas.map((b, i) => (
          <Skeleton key={i} className={cn("h-12 rounded-interno", b)} />
        ))}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-divisoria p-3">
        <Skeleton className="h-11 rounded-controle" />
        <div className="flex gap-1.5 overflow-hidden">
          <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
        </div>
        <div className="flex items-end gap-2.5">
          <Skeleton className="h-12 flex-1 rounded-controle" />
          <Skeleton className="size-12 shrink-0 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/** Contexto do cliente: avatar grande, nome, dois indicadores e o poço de organização. */
function SkeletonContexto() {
  return (
    <Card className="order-3 flex min-w-0 flex-col gap-4 p-3 lg:order-none">
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Skeleton className="h-16 rounded-interno" />
        <Skeleton className="h-16 rounded-interno" />
      </div>
      <div className="space-y-3 rounded-interno bg-poco p-3.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-11 rounded-controle" />
        <Skeleton className="h-11 rounded-controle" />
        <Skeleton className="h-11 rounded-controle" />
      </div>
    </Card>
  );
}

/**
 * Atendimento WhatsApp, seguindo o artboard: lista de conversas, conversa com log dominante e
 * compositor fino, e contexto do cliente. `janela` é a tela própria (sem sidebar), com a barra
 * superior e a primeira linha mais baixa.
 */
export function SkeletonAtendimento({ janela = false }: { janela?: boolean }) {
  const grade = cn(
    "grid gap-3 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)_minmax(16rem,20rem)] lg:items-stretch lg:[&>*]:min-h-0",
    janela ? "lg:grid-rows-[minmax(32rem,calc(100dvh-5.5rem))]" : "lg:grid-rows-[minmax(40rem,calc(100dvh-10rem))]"
  );
  const corpo = (
    <div className={grade}>
      <SkeletonConversas />
      <SkeletonConversa />
      <SkeletonContexto />
    </div>
  );
  if (janela) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="flex min-h-dvh flex-col bg-background">
        <span className="sr-only">Carregando…</span>
        <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-divisoria bg-card px-4 py-2">
          <Skeleton className="size-8 rounded-controle" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-44 rounded-full" />
          <Skeleton className="ml-auto h-5 w-36" />
          <Skeleton className="size-11 rounded-controle" />
        </header>
        <div className="flex-1 p-3 lg:p-4">{corpo}</div>
      </div>
    );
  }
  return (
    <SkeletonRegiao className="space-y-4">
      <SkeletonCabecalho
        selo
        descricao={false}
        tituloLargura="w-72"
        acoes={<SkeletonAbas itens={5} compacto />}
      />
      {corpo}
    </SkeletonRegiao>
  );
}

/**
 * Login (`/login`): painel de marca à esquerda (decorativo) e formulário à direita, com os mesmos
 * contêineres da tela real. No celular o formulário vem primeiro, como lá.
 */
export function SkeletonLogin() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex min-h-screen flex-wrap gap-4 bg-background p-4">
      <span className="sr-only">Carregando…</span>
      <div className="order-2 flex min-w-0 flex-[1_1_32.5rem] min-[960px]:order-1">
        <section className="flex min-h-0 flex-[1_1_32.5rem] flex-col justify-between gap-10 overflow-hidden rounded-shell bg-card p-6 sm:min-h-[22.5rem] sm:p-10 lg:p-12">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-controle" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex flex-col gap-7">
            <div className="space-y-1.5">
              <Skeleton className="h-9 w-64 max-w-full sm:h-10 lg:h-12" />
              <Skeleton className="h-9 w-72 max-w-full sm:h-10 lg:h-12" />
              <Skeleton className="h-9 w-40 max-w-full sm:h-10 lg:h-12" />
            </div>
            <div className="max-w-lg rounded-painel bg-poco p-5">
              <SkeletonGrafico altura="h-36" />
            </div>
          </div>
        </section>
      </div>
      <div className="order-1 flex min-w-0 flex-[1_1_26rem] items-center justify-center px-0 py-6 sm:px-4 sm:py-10 min-[960px]:order-2">
        <div className="flex w-full max-w-[25rem] flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex h-9 items-center">
              <Skeleton className="h-7 w-28" />
            </div>
            <div className="flex h-12 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-5 items-center">
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-12 w-full rounded-controle" />
          </div>
          <div className="space-y-2">
            <div className="flex h-5 items-center">
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-12 w-full rounded-controle" />
          </div>
          <Skeleton className="h-12 w-full rounded-controle" />
          {/* Espaço do `role="alert"` da tela real: vazio, mas conta no gap do formulário. */}
          <div aria-hidden="true" className="h-0" />
        </div>
      </div>
    </div>
  );
}
