import { SkeletonCabecalho, SkeletonKpis, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonKpis quantidade={5} />
      <SkeletonPainel tituloLargura="w-40">
        <SkeletonLinhas linhas={6} colunas={4} />
      </SkeletonPainel>
    </div>
  );
}
