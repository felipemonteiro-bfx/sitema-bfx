import {
  SkeletonAbas,
  SkeletonCabecalho,
  SkeletonGrafico,
  SkeletonKpis,
  SkeletonPainel,
  SkeletonRegiao,
  SkeletonVazio,
} from "@/components/ui/skeleton";

// Obrigações: 3 KPIs, "Capital próprio necessário, dia a dia" (gráfico num poço) e "Boletos Prudent"
// (abas de situação + lista).
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-72" />
      <SkeletonKpis quantidade={3} rodape={2} />
      <SkeletonPainel tituloLargura="w-80" className="min-h-[378px] lg:min-h-[306px]">
        <SkeletonGrafico altura="h-36" />
      </SkeletonPainel>
      <SkeletonPainel plano tituloLargura="w-40" className="min-h-[368px] lg:min-h-[348px]">
        <SkeletonAbas itens={4} />
        <SkeletonVazio className="py-6" />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
