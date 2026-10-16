import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonComAbas,
  SkeletonKpis,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
  SkeletonVazio,
} from "@/components/ui/skeleton";

// Antecipação Prudent: abas (Aguardando RH, Fila, Histórico), o resumo "o que já foi e o que falta"
// (4 indicadores, nota e vazio) e o painel "Vendas — Antecipação" com filtros, tabela e totais.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-96" tituloLinhas={2} descricaoLinhas={3} />
      <SkeletonComAbas itens={3}>
        <SkeletonPainel compacto subtitulo tituloLargura="w-80" className="min-h-[1418px] lg:min-h-[639px]">
          <div className="space-y-4">
            <SkeletonKpis quantidade={4} />
            <Skeleton className="h-24 rounded-interno" />
            <SkeletonVazio />
          </div>
        </SkeletonPainel>
      </SkeletonComAbas>
      <SkeletonPainel compacto acao tituloLargura="w-56" className="min-h-[1186px] lg:min-h-[568px]">
        <div className="space-y-4">
          <SkeletonCampos campos={3} colunas="grid-cols-2 md:grid-cols-4" />
          <SkeletonLinhas linhas={2} colunas={7} />
          <div className="flex flex-wrap gap-3">
            <SkeletonBotao className="w-32" />
            <SkeletonBotao className="w-40" />
          </div>
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
