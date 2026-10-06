import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/** Abre o termo assinado no navegador, para conferir antes de enviar ao RH. */
export function VerTermoAssinadoLink({ vendaId, className }: { vendaId: number; className?: string }) {
  return (
    <a
      href={`/api/assinatura/documento?vendaId=${vendaId}&inline=1`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver termo da venda ${vendaId}. Abre em uma nova aba.`}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs gap-1", className)}
    >
      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
      Ver termo
    </a>
  );
}
