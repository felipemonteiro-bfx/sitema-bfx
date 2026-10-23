import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonComAbas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Configurações: abas (Mural, Recibo, Asaas, IA, WhatsApp, E-mail, Uber) coladas no painel da aba ativa.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-60" />
      <SkeletonComAbas itens={7}>
        <SkeletonPainel plano tituloLargura="w-56" className="min-h-[304px] lg:min-h-[284px]">
          <div className="space-y-4">
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-20 rounded-controle" />
            <SkeletonBotao className="w-36" />
          </div>
        </SkeletonPainel>
      </SkeletonComAbas>
    </SkeletonRegiao>
  );
}
