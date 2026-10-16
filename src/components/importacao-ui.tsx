import { Badge } from "@/components/ui/badge";

/**
 * Peças de apresentação compartilhadas pelas três importações (clientes, fornecedores,
 * e-Consignado). Só visual: nenhuma regra de análise ou gravação passa por aqui.
 */

/** Contador da análise/resultado: card interno neutro, número em mono. */
export function Contador({
  label,
  valor,
  erro = false,
}: {
  label: string;
  valor: number;
  /** Contador de erros: quando maior que zero o número ganha o selo de erro. */
  erro?: boolean;
}) {
  return (
    <div className="rounded-interno bg-card-elevated px-4 py-3">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium tabular-nums text-foreground">
        {erro && valor > 0 ? (
          <Badge variant="error" size="lg" className="font-mono tabular-nums">
            {valor}
          </Badge>
        ) : (
          valor
        )}
      </div>
    </div>
  );
}
