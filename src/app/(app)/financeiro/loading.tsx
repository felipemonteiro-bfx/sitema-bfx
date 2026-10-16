import {
  Skeleton,
  SkeletonCabecalho,
  SkeletonComAbas,
  SkeletonKpis,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Financeiro & DRE: cabeçalho com o seletor de período, abas (DRE, Fluxo, Lançamentos, Estoque),
// 3 KPIs e "Composição dos custos" (5 cards de custo + capital em estoque).
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho
        tituloLargura="w-72"
        acoes={
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-11 w-44 rounded-controle" />
          </div>
        }
      />
      <SkeletonComAbas itens={4}>
        <SkeletonKpis quantidade={3} rodape={2} />
      </SkeletonComAbas>
      <SkeletonPainel compacto subtitulo tituloLargura="w-56" className="min-h-[397px]">
        <div className="space-y-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-interno" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-interno" />
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
