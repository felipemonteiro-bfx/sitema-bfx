import { SkeletonAbas, SkeletonCabecalho, SkeletonCampos, SkeletonLinhas, SkeletonPainel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonCabecalho />
      <SkeletonAbas itens={4} />
      <SkeletonPainel tituloLargura="w-36">
        <SkeletonCampos campos={9} colunas="md:grid-cols-3" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-32">
        <SkeletonLinhas linhas={8} colunas={5} />
      </SkeletonPainel>
    </div>
  );
}
