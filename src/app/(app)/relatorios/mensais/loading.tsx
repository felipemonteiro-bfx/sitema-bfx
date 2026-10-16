import { SkeletonCabecalho, SkeletonCampos, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-40">
        <SkeletonCampos campos={1} colunas="md:grid-cols-3" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonLinhas linhas={4} colunas={4} />
      </SkeletonPainel>
    </div>
  );
}
