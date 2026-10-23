import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Relatórios: "Relatório de vendas" (2/3) ao lado de "Outros relatórios" (1/3) e o painel de atalhos.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-44" />
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[695fr_339fr]">
          <SkeletonPainel plano tituloLargura="w-48" className="min-h-[749px] lg:min-h-[451px]">
            <SkeletonCampos campos={4} colunas="sm:grid-cols-3" />
            <div className="mt-4 flex flex-wrap gap-3">
              <SkeletonBotao className="w-44" />
              <SkeletonBotao className="w-36" />
            </div>
            <Skeleton className="mt-6 h-24 rounded-interno" />
          </SkeletonPainel>
          <SkeletonPainel plano tituloLargura="w-44" className="min-h-[397px] lg:min-h-[451px]">
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-interno" />
              <Skeleton className="h-32 rounded-interno" />
            </div>
          </SkeletonPainel>
        </div>
        <SkeletonPainel
          plano
          tituloLargura="w-24"
          className="min-h-[301px] lg:max-w-[calc((100%-1rem)*339/1034)]"
        >
          <div className="space-y-2">
            <SkeletonBotao className="w-full" />
            <SkeletonBotao className="w-full" />
            <SkeletonBotao className="w-full" />
            <SkeletonBotao className="w-full" />
          </div>
        </SkeletonPainel>
      </div>
    </SkeletonRegiao>
  );
}
