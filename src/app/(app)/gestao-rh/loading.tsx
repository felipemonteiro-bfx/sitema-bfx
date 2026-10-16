import { SkeletonAbas, SkeletonCabecalho, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonAbas itens={4} />
      <SkeletonPainel tituloLargura="w-28">
        <SkeletonLinhas linhas={6} colunas={4} />
      </SkeletonPainel>
    </div>
  );
}
