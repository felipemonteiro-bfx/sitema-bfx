import { SkeletonCabecalho, SkeletonCampos, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-48">
        <SkeletonCampos campos={3} colunas="sm:grid-cols-3" />
      </SkeletonPainel>
    </div>
  );
}
