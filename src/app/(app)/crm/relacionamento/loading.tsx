import {
  Skeleton,
  SkeletonAbas,
  SkeletonCabecalho,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// CRM > Relacionamento: áreas do CRM, "Segmentos dos últimos 12 meses" (4 cards + nota) e a tabela
// "Recência, frequência e valor".
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-96" tituloLinhas={2} descricaoLinhas={3} />
      <div className="-mt-2">
        <SkeletonAbas itens={5} compacto />
      </div>
      <SkeletonPainel compacto subtitulo tituloLargura="w-64" className="min-h-[978px] lg:min-h-[373px]">
        <div className="space-y-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-interno" />
            ))}
          </div>
          <Skeleton className="h-28 max-w-3xl rounded-interno" />
        </div>
      </SkeletonPainel>
      <SkeletonPainel compacto subtitulo tituloLargura="w-64" className="min-h-[680px] lg:min-h-[432px]">
        <SkeletonLinhas linhas={6} colunas={6} compacta />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
