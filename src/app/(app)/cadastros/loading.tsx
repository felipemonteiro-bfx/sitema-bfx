import {
  SkeletonBotao,
  SkeletonCabecalho,
  SkeletonCampos,
  SkeletonComAbas,
  SkeletonLinhas,
  SkeletonPainel,
  SkeletonRegiao,
} from "@/components/ui/skeleton";

// Cadastros: abas (Clientes, Produtos, Fornecedores, Empresas) coladas no formulário "Novo cadastro"
// (3 fileiras de campos + salvar) e no painel da lista com filtros e busca.
export default function Loading() {
  return (
    <SkeletonRegiao>
      <SkeletonCabecalho tituloLargura="w-48" />
      <SkeletonComAbas itens={4}>
        <div className="space-y-4">
          <SkeletonPainel plano tituloLargura="w-36" className="min-h-[388px]">
            <SkeletonCampos campos={9} colunas="grid-cols-1 md:grid-cols-3" />
            <div className="mt-4 flex justify-end">
              <SkeletonBotao className="w-36" />
            </div>
          </SkeletonPainel>
          <SkeletonPainel tituloLargura="w-28" acao className="min-h-[828px] lg:min-h-[504px]">
            <SkeletonLinhas linhas={6} colunas={6} />
          </SkeletonPainel>
        </div>
      </SkeletonComAbas>
    </SkeletonRegiao>
  );
}
