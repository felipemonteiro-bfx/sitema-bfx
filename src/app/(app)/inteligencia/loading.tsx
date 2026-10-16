import { SkeletonCabecalho, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonLinhas linhas={8} colunas={2} />
      </SkeletonPainel>
    </div>
  );
}
