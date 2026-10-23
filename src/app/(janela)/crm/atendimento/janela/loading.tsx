import { SkeletonAtendimento } from "@/components/ui/skeleton";

// Janela própria do atendimento (sem sidebar): barra superior + as mesmas três colunas, com a
// primeira linha mais baixa (`calc(100dvh - 5.5rem)`).
export default function Loading() {
  return <SkeletonAtendimento janela />;
}
