import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EstadoAssinatura = "assinada" | "aguardando" | "sem-contrato" | "cancelada";

/**
 * Estado de assinatura de UMA venda, com o mesmo critério que a linha do
 * Histórico já usava: assinada = `Assinatura.assinaturaStatus === "assinado"`;
 * aguardando = tem link (`assinaturaToken`) e não está assinada (cobre venda sem
 * linha em `assinaturas`, `expirado` e `processando`, como `whereAssinaturaPendente`);
 * cancelada/estornada vence os outros, pois a venda saiu do fluxo.
 */
export function estadoAssinatura(v: {
  status?: string | null;
  assinaturaStatus?: string | null;
  assinaturaToken?: string | null;
}): EstadoAssinatura {
  if (v.status === "cancelada" || v.status === "estornada") return "cancelada";
  if (v.assinaturaStatus === "assinado") return "assinada";
  if (v.assinaturaToken) return "aguardando";
  return "sem-contrato";
}

const CONFIG: Record<EstadoAssinatura, { rotulo: string; Icone: typeof CheckCircle2; cor: string }> = {
  assinada: { rotulo: "Assinada", Icone: CheckCircle2, cor: "text-foreground" },
  // Só "aguardando" leva a cor da marca: é o estado que pede ação.
  aguardando: { rotulo: "Aguardando assinatura", Icone: Clock, cor: "text-marca-tint-texto" },
  "sem-contrato": { rotulo: "Sem contrato", Icone: CircleDashed, cor: "text-muted-foreground" },
  cancelada: { rotulo: "Cancelada", Icone: XCircle, cor: "text-muted-foreground" },
};

/** Ícone + texto: o estado nunca depende só da cor. */
export function StatusAssinatura({ estado, className }: { estado: EstadoAssinatura; className?: string }) {
  const { rotulo, Icone, cor } = CONFIG[estado];
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-sm", cor, className)}>
      <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
      {rotulo}
    </span>
  );
}
