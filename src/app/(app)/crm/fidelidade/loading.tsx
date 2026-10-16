import { SkeletonCabecalho, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonPainel tituloLargura="w-48">
          <SkeletonLinhas linhas={5} colunas={3} />
        </SkeletonPainel>
        <SkeletonPainel tituloLargura="w-48">
          <SkeletonLinhas linhas={5} colunas={3} />
        </SkeletonPainel>
      </div>
    </div>
  );
}
