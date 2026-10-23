import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonPainel,
  SkeletonRegiao,
  SkeletonVazio,
} from "@/components/ui/skeleton";

// Relatórios mensais: "Gerar / enviar agora" (mês + botão + nota) e o histórico de envios.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-96" tituloLinhas={2} />
      <SkeletonPainel plano tituloLargura="w-48" className="min-h-[337px] lg:min-h-[221px]">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex h-5 items-center">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-11 w-44 rounded-controle" />
              <SkeletonBotao className="w-36" />
            </div>
          </div>
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
      </SkeletonPainel>
      <SkeletonVazio />
    </SkeletonRegiao>
  );
}
