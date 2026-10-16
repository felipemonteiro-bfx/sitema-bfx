import { SkeletonAbas, SkeletonCabecalho, SkeletonCampos, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonAbas itens={5} />
      <SkeletonPainel tituloLargura="w-36">
        <SkeletonCampos campos={4} colunas="md:grid-cols-2" />
      </SkeletonPainel>
    </div>
  );
}
