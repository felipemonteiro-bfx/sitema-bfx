import {
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonGrafico,
  SkeletonKpis,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Comissões: filtros (vendedor + período), 3 KPIs, gráfico por vendedor e o detalhamento.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-80" tituloLinhas={2} />
      <SkeletonPainel plano tituloLargura="w-24" className="min-h-[171px]">
        <SkeletonCampos campos={3} colunas="md:grid-cols-3" />
      </SkeletonPainel>
      <SkeletonKpis quantidade={3} />
      <SkeletonPainel tituloLargura="w-56" className="min-h-[405px]">
        <SkeletonGrafico altura="h-72" />
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-52" className="min-h-[161px]">
        <SkeletonLinhas linhas={1} colunas={4} />
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
