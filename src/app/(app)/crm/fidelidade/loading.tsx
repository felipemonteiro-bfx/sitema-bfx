import {
  SkeletonAbas,
  SkeletonCabecalho,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// CRM > Fidelidade: áreas do CRM e dois painéis lado a lado (saldo de pontos e movimentações).
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-44" />
      <div className="-mt-2">
        <SkeletonAbas itens={5} compacto />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonPainel tituloLargura="w-56" className="min-h-[266px] lg:min-h-[258px]">
          <SkeletonLinhas linhas={2} colunas={4} />
        </SkeletonPainel>
        <SkeletonPainel tituloLargura="w-56" className="min-h-[258px]">
          <SkeletonLinhas linhas={2} colunas={2} />
        </SkeletonPainel>
      </div>
    </SkeletonRegiao>
  );
}
