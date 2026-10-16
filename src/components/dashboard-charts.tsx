import { Package } from "lucide-react";
import { EmptyStateInline } from "@/components/ui/empty-state";

// A evolução mensal (antes um ComposedChart do Recharts, aqui) agora é `EvolucaoMensal`,
// um componente de servidor próprio. Este arquivo ficou só com o Top produtos.

export type ProdutoTop = { label: string; value: number };

// Hachura da trilha de cada barra: tokens, igual à do gráfico de evolução.
/** Top produtos por unidades vendidas no período: poço com uma barra por produto. */
export function TopProdutos({ produtos, className }: { produtos: ProdutoTop[]; className?: string }) {
  const lista = [...produtos].sort((a, b) => b.value - a.value);
  const maior = lista[0]?.value ?? 0;

  return (
    <section
      aria-labelledby="top-produtos-titulo"
      className={["rounded-painel border border-border bg-card p-2 pt-5", className].filter(Boolean).join(" ")}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-4">
        <h2 id="top-produtos-titulo" className="text-lg font-semibold">
          Top produtos
        </h2>
        <span className="text-sm text-muted-foreground">unidades no período</span>
      </div>
      <div className="rounded-interno bg-poco py-1">
        {lista.length === 0 ? (
          <EmptyStateInline message="Sem dados de produtos" icon={Package} className="py-8" />
        ) : (
          <ol className="divide-y divide-grafico-trilha">
            {lista.map((p, i) => (
              <li
                key={p.label}
                className="grid grid-cols-[minmax(0,1fr)_7.5rem_3.5rem] items-center gap-3 px-4 py-3 text-sm sm:gap-4"
              >
                <span className="truncate" title={p.label}>
                  {p.label}
                </span>
                {/* Valor aproximado pela barra: o número exato está ao lado, em mono. */}
                <span aria-hidden="true" className="bloco-sensivel block h-2 overflow-hidden rounded-sm bg-hachura-trilha">
                  <span
                    className={`block h-full w-(--w) rounded-sm ${i === 0 ? "bg-primary" : "bg-grafico-neutro"}`}
                    style={{ "--w": `${maior > 0 ? (p.value / maior) * 100 : 0}%` } as React.CSSProperties}
                  />
                </span>
                <span className="text-right font-mono text-texto-secundario">{p.value} un.</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
