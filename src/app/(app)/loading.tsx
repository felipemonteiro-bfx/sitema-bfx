import { SkeletonGenerico } from "@/components/ui/skeleton";

// Esqueleto das rotas sem `loading.tsx` próprio: cabeçalho e um painel com tabela.
// As telas de layout distinto (Início, Histórico, Venda rápida, Atendimento...) têm o seu.
export default function Loading() {
  return <SkeletonGenerico />;
}
