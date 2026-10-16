import {
  Skeleton,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Perfil: "Dados pessoais" e "Alterar senha" na coluna larga (2/3) e "Suas comissões" na coluna estreita.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-40" />
      <div className="grid gap-6 lg:grid-cols-[692fr_334fr]">
        <SkeletonPainel plano tituloLargura="w-36" className="min-h-[296px]">
          <SkeletonCampos campos={4} colunas="md:grid-cols-2" gap="gap-3" />
          <SkeletonBotao className="mt-3 w-full" />
        </SkeletonPainel>
        <div className="hidden lg:block" aria-hidden="true" />
        <SkeletonPainel plano tituloLargura="w-32" className="min-h-[376px]">
          <SkeletonCampos campos={3} colunas="grid-cols-1" gap="gap-3" />
          <SkeletonBotao className="mt-3 w-full" />
        </SkeletonPainel>
        <SkeletonPainel plano tituloLargura="w-36" className="min-h-[376px]">
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-interno" />
            <Skeleton className="h-20 rounded-interno" />
            <SkeletonBotao className="w-full" />
          </div>
        </SkeletonPainel>
      </div>
    </SkeletonRegiao>
  );
}
