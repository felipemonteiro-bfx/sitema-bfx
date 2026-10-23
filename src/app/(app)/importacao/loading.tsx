import {
  Skeleton,
  SkeletonAbas,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Importação: as abas (Vendas, Clientes, Fornecedores, e-Consignado) dividem a linha com o total do
// banco e "Baixar modelo" (não ficam no cabeçalho); abaixo, o passo 1 "Selecionar arquivo".
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-80" descricaoLinhas={4} />
      <div className="-mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SkeletonAbas itens={4} compacto />
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-6 w-10" />
          </div>
          <SkeletonBotao className="h-9 w-28" />
        </div>
      </div>
      <SkeletonPainel plano tituloLargura="w-48" className="min-h-[208px] lg:min-h-[160px]">
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonBotao className="w-40" />
          <Skeleton className="h-4 w-44" />
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
