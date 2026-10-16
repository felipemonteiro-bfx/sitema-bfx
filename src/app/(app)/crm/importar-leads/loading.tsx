import {
  Skeleton,
  SkeletonAbas,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// CRM > Importar leads: áreas do CRM e o painel "Lista de funcionários" (empresa + área de texto).
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-96" tituloLinhas={2} descricaoLinhas={3} />
      <div className="-mt-2">
        <SkeletonAbas itens={5} compacto />
      </div>
      <SkeletonPainel plano tituloLargura="w-52" className="min-h-[566px] lg:min-h-[518px]">
        <div className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-controle md:max-w-md" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-64 w-full rounded-controle" />
          </div>
          <div className="flex items-center gap-4">
            <SkeletonBotao className="w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
