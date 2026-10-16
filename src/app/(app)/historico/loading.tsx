import { SkeletonCabecalho, SkeletonCampos, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonCampos campos={4} colunas="md:grid-cols-2" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonLinhas linhas={10} colunas={7} />
      </SkeletonPainel>
    </div>
  );
}
