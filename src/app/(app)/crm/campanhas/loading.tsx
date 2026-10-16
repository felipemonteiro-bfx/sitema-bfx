import { SkeletonCabecalho, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonPainel tituloLargura="w-40">
        <SkeletonLinhas linhas={3} colunas={4} />
      </SkeletonPainel>
    </div>
  );
}
