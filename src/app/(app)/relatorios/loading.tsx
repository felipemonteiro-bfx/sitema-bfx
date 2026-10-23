import { Skeleton, SkeletonBotao, SkeletonCabecalho, SkeletonCampos, SkeletonPainel, SkeletonRegiao } from '@/components/ui/skeleton';
export default function Loading() {
 return <SkeletonRegiao>
  <SkeletonCabecalho tituloLargura="w-44"/>
  <Skeleton className="h-15 w-full rounded-controle"/>
  <SkeletonPainel plano tituloLargura="w-48">
   <SkeletonCampos campos={4} colunas="sm:grid-cols-2 xl:grid-cols-4"/>
   <div className="mt-6 flex flex-wrap gap-3"><SkeletonBotao className="w-44"/><SkeletonBotao className="w-36"/></div>
  </SkeletonPainel>
 </SkeletonRegiao>;
}
