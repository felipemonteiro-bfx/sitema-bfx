import { SkeletonAbas, SkeletonCabecalho, SkeletonKpis, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho acoes />
      <SkeletonAbas itens={4} />
      <SkeletonKpis quantidade={3} />
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonLinhas linhas={8} colunas={4} />
      </SkeletonPainel>
    </div>
  );
}
