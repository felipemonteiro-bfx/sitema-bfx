import { Skeleton, SkeletonCabecalho, SkeletonRegiao } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// BFX Intelligence: cabeçalho com "Limpar conversa" e um painel único com o histórico do chat
// (poço), as sugestões e o compositor de uma linha.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho acoes tituloLargura="w-80" />
      <Card className="flex min-h-[482px] lg:min-h-[650px] flex-col gap-4 p-6">
        <div className="flex flex-1 flex-col justify-end gap-3 rounded-interno bg-poco p-4">
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="grid gap-2 md:grid-cols-2">
            <Skeleton className="h-12 rounded-interno" />
            <Skeleton className="h-12 rounded-interno" />
          </div>
        </div>
        <Skeleton className="h-16 rounded-controle" />
      </Card>
    </SkeletonRegiao>
  );
}
