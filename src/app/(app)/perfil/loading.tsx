import { SkeletonCabecalho, SkeletonCampos, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-36">
        <SkeletonCampos campos={6} colunas="md:grid-cols-2" />
      </SkeletonPainel>
    </div>
  );
}
