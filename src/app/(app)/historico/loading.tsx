import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Histórico: cabeçalho com Exportar/Nova venda, busca, linha de chips com a barra de distribuição,
// "Filtro avançado" (6 controles + Filtrar) e a tabela de vendas.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho acoes={2} tituloLargura="w-40" descricaoLinhas={1} />
      <Skeleton className="h-11 w-full rounded-controle" />
      <div className="space-y-2 lg:flex lg:h-6 lg:items-center lg:gap-4 lg:space-y-0">
        <Skeleton className="h-5 w-20 lg:shrink-0" />
        <Skeleton className="h-2.5 w-full lg:min-w-24 lg:flex-1" />
        <div className="flex flex-wrap gap-x-4 gap-y-2 lg:shrink-0 lg:flex-nowrap">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <SkeletonPainel plano tituloLargura="w-36" className="lg:min-h-[207px]">
        {/* Celular: um botão "Filtros" abre a folha; de lg em diante os 6 controles ficam à mostra. */}
        <Skeleton className="h-11 rounded-controle lg:hidden" />
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_1fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-controle" />
            ))}
          </div>
          <SkeletonBotao className="mt-3 w-36" />
        </div>
      </SkeletonPainel>
      <SkeletonPainel tituloLargura="w-32" className="min-h-[502px] lg:min-h-[285px]">
        {/* Celular: cartões de venda e o card de totais; de lg em diante, a tabela. */}
        <div className="space-y-3 lg:hidden">
          <Skeleton className="h-44 rounded-interno" />
          <Skeleton className="h-44 rounded-interno" />
          <Skeleton className="h-20 rounded-interno" />
        </div>
        <div className="hidden lg:block">
          <SkeletonLinhas linhas={2} colunas={9} />
        </div>
      </SkeletonPainel>
    </SkeletonRegiao>
  );
}
