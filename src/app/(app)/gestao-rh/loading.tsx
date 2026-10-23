import {
  Skeleton,
  SkeletonCabecalho,
  SkeletonComAbas,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// Gestão de RH: painel com 3 indicadores, abas (Metas e comissões, Detalhes, Contratar) coladas no
// painel "Equipe".
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-72" />
      <Card className="grid gap-4 p-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-interno" />
        ))}
      </Card>
      <SkeletonComAbas itens={3}>
        <SkeletonPainel tituloLargura="w-24" className="min-h-[311px] lg:min-h-[293px]">
          <SkeletonLinhas linhas={3} colunas={5} compacta />
        </SkeletonPainel>
      </SkeletonComAbas>
    </SkeletonRegiao>
  );
}
