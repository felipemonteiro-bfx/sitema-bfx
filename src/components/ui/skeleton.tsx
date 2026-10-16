import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Esqueletos no layout do Vantage: PageHeader -> painel (`Card`) -> poço/card interno.
// O bloco é neutro (`divisoria`, o cinza decorativo do tema), de cor chapada, e só pulsa;
// a pulsação some com prefers-reduced-motion.

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse rounded-md bg-divisoria motion-reduce:animate-none", className)}
    />
  );
}

/** Cabeçalho da página: trilha, título, descrição e (opcional) ações à direita. */
export function SkeletonCabecalho({ acoes = false, trilha = true }: { acoes?: boolean; trilha?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {trilha && <Skeleton className="h-4 w-40" />}
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {acoes && <Skeleton className="h-11 w-32 rounded-controle" />}
    </div>
  );
}

/** Fileira de KPIs: painel com cards internos, na mesma grade do `KpiCard`. */
export function SkeletonKpis({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 rounded-painel border border-painel-borda bg-card p-2">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-interno bg-card-elevated px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Painel com título de seção e um poço dentro; o conteúdo do poço vem de `children`. */
export function SkeletonPainel({
  children,
  tituloLargura = "w-40",
  className,
}: {
  children: React.ReactNode;
  tituloLargura?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-2 pt-5", className)}>
      <div className="px-4 pb-4">
        <Skeleton className={cn("h-6", tituloLargura)} />
      </div>
      <div className="rounded-interno bg-poco p-4">{children}</div>
    </Card>
  );
}

/** Linhas de tabela dentro de um poço (cabeçalho + corpo). */
export function SkeletonLinhas({ linhas = 6, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: colunas }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-divisoria">
        {Array.from({ length: linhas }).map((_, r) => (
          <div key={r} className="flex gap-4 py-3">
            {Array.from({ length: colunas }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Campos de formulário (rótulo + controle de 44px) em grade, dentro de um poço. */
export function SkeletonCampos({ campos = 6, colunas = "md:grid-cols-3" }: { campos?: number; colunas?: string }) {
  return (
    <div className={cn("grid gap-4", colunas)}>
      {Array.from({ length: campos }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-controle" />
        </div>
      ))}
    </div>
  );
}

/** Segmentado (abas) do Vantage: trilho `controle` com itens. */
export function SkeletonAbas({ itens = 4 }: { itens?: number }) {
  return (
    <div className="inline-flex min-h-12 items-center gap-1 rounded-controle border border-divisoria bg-controle p-1">
      {Array.from({ length: itens }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-lg" />
      ))}
    </div>
  );
}

/** Gráfico de barras num poço, com alturas fixas (nada de Math.random: hidratação estável). */
export function SkeletonGrafico() {
  const alturas = [45, 70, 55, 85, 60, 95, 75];
  return (
    <div className="flex h-48 items-end gap-2 pt-4">
      {alturas.map((h, i) => (
        <Skeleton key={i} className="h-(--h) flex-1 rounded-b-none" style={{ "--h": `${h}%` } as React.CSSProperties} />
      ))}
    </div>
  );
}

/** Esqueleto do Início: cabeçalho, KPIs, dois painéis de gráfico e uma tabela. */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho acoes trilha={false} />
      <SkeletonKpis quantidade={4} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <SkeletonPainel tituloLargura="w-44">
          <SkeletonGrafico />
        </SkeletonPainel>
        <SkeletonPainel tituloLargura="w-36">
          <SkeletonLinhas linhas={5} colunas={4} />
        </SkeletonPainel>
      </div>
    </div>
  );
}
