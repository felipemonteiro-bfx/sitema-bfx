import {
  SkeletonAbas,
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonPainel,
  SkeletonRegiao,
  SkeletonVazio,
} from "@/components/ui/skeleton";

// CRM > Campanhas: áreas do CRM, "Nova campanha" (nome, 5 filtros, template, agendamento) e a lista.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-72" />
      <div className="-mt-2">
        <SkeletonAbas itens={5} compacto />
      </div>
      <SkeletonPainel plano tituloLargura="w-40" className="min-h-[930px] lg:min-h-[502px]">
        <div className="space-y-4">
          <SkeletonCampos campos={1} colunas="md:max-w-md" />
          <SkeletonCampos campos={5} colunas="lg:grid-cols-5" />
          <SkeletonCampos campos={1} colunas="grid-cols-1" />
          <SkeletonCampos campos={1} colunas="md:max-w-xs" />
          <SkeletonBotao className="w-40" />
        </div>
      </SkeletonPainel>
      <SkeletonVazio className="py-20" />
    </SkeletonRegiao>
  );
}
