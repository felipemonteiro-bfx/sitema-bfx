import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PeriodoRapido } from "@/lib/dashboard-periodo";

/**
 * Seletor de período do Início (Hoje / 7 dias / Mês / Trimestre). Componente de servidor:
 * cada opção é um link que monta `from`/`to` na URL, então funciona sem JavaScript.
 * Mesmo trilho segmentado do TabsList (`controle` com contorno `divisoria`); o item ativo
 * sobe para `controle-ativo` em semibold e leva `aria-current`.
 */
export function PeriodoSegmentado({ periodos, className }: { periodos: Pick<PeriodoRapido, "label" | "href" | "ativo">[]; className?: string }) {
  return (
    <nav
      aria-label="Período"
      className={cn("inline-flex items-center gap-1 rounded-controle border border-divisoria bg-controle p-1", className)}
    >
      {periodos.map((p) => (
        <Link
          key={p.label}
          href={p.href}
          aria-current={p.ativo ? "true" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-(--mov-segmentado) ease-(--mov-curva) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:px-4",
            p.ativo && "bg-controle-ativo font-semibold text-foreground"
          )}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
