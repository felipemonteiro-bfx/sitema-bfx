import {
  Skeleton,
  SkeletonAbas,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// CRM > Clientes: cabeçalho, áreas do CRM + "Importar leads", funil (5 estágios), filtros, tags e a lista.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-24" />
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <SkeletonAbas itens={5} compacto />
        <Skeleton className="h-9 w-28 rounded-controle" />
      </div>
      <SkeletonPainel compacto subtitulo tituloLargura="w-48" className="min-h-[234px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-interno" />
          ))}
        </div>
      </SkeletonPainel>
      <SkeletonPainel plano semTitulo className="min-h-[486px] lg:min-h-[166px]">
        <SkeletonCampos campos={5} colunas="lg:grid-cols-5" />
      </SkeletonPainel>
      <SkeletonPainel plano tituloLargura="w-16" className="min-h-[212px] lg:min-h-[168px]">
        <Skeleton className="h-4 w-40" />
        <SkeletonBotao className="mt-4 w-48" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-28" className="min-h-[566px] lg:min-h-[502px]">
        <SkeletonLinhas linhas={6} colunas={7} />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
