import { SkeletonCabecalho, SkeletonCampos, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonCampos campos={9} colunas="md:grid-cols-3" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-28">
        <SkeletonLinhas linhas={3} colunas={3} />
      </SkeletonPainel>
    </div>
  );
}
