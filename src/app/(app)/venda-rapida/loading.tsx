import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Venda rápida (terminal): Contexto, Cliente, Produtos (cabeçalho com botão + card do produto),
// Despesas, Parcelamento e Resumo financeiro. O cartão "Última venda" só existe após uma venda.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-64" descricaoLinhas={1} />
      <SkeletonPainel compacto tituloLargura="w-44" className="min-h-[236px] lg:min-h-[152px]">
        <SkeletonCampos campos={2} colunas="lg:grid-cols-2" />
      </SkeletonPainel>
      <SkeletonPainel compacto tituloLargura="w-24" className="min-h-[168px]">
        <SkeletonCampos campos={1} colunas="grid-cols-1" />
      </SkeletonPainel>
      <div className="space-y-4">
        <div className="flex h-11 items-center justify-between gap-4">
          <Skeleton className="h-6 w-48" />
          <SkeletonBotao className="w-44" />
        </div>
        <SkeletonPainel compacto tituloLargura="w-28" className="min-h-[508px] lg:min-h-[208px]">
          <SkeletonCampos campos={4} colunas="lg:grid-cols-4" />
        </SkeletonPainel>
      </div>
      <SkeletonPainel compacto tituloLargura="w-48" className="min-h-[685px] lg:min-h-[389px]">
        <SkeletonCampos campos={6} colunas="lg:grid-cols-4" />
      </SkeletonPainel>
      <SkeletonPainel compacto tituloLargura="w-36" className="min-h-[148px]">
        <SkeletonCampos campos={1} colunas="grid-cols-1" />
      </SkeletonPainel>
      <SkeletonPainel compacto tituloLargura="w-40" className="min-h-[1041px] lg:min-h-[626px]">
        <SkeletonCampos campos={8} colunas="lg:grid-cols-4" />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
