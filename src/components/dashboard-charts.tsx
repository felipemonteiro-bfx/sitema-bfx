import { Package } from "lucide-react";
import { EmptyStateInline } from "@/components/ui/empty-state";
import { EvolucaoMensal } from "@/components/evolucao-mensal";

// A evolução mensal (antes um ComposedChart do Recharts, aqui) agora é `EvolucaoMensal`,
// um componente de servidor. Este arquivo ficou com o Top produtos e com um invólucro de
// compatibilidade para a página atual, que a D2 deixa de usar.

export type ProdutoTop = { label: string; value: number };

// Hachura da trilha de cada barra: tokens, igual à do gráfico de evolução.
const TRILHA = "repeating-linear-gradient(135deg, var(--grafico-inativo) 0 2px, transparent 2px 5px)";

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
                <span aria-hidden="true" className="bloco-sensivel block h-2 overflow-hidden rounded-sm" style={{ background: TRILHA }}>
                  <span
                    className={`block h-full rounded-sm ${i === 0 ? "bg-primary" : "bg-grafico-neutro"}`}
                    style={{ width: `${maior > 0 ? (p.value / maior) * 100 : 0}%` }}
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

type EvoRow = { mes: string; total: number; lucro: number };

/**
 * @deprecated Compatibilidade com `dashboard/page.tsx` até a D2 montar o Início novo
 * (`<EvolucaoMensal meses={...} />` + `<TopProdutos produtos={...} />` direto).
 * Mapeia o formato antigo: o `lucro` daquela série é o faturamento menos o custo, ou seja,
 * a margem; o custo variável é o que sobra.
 */
export function DashboardCharts({ evoData, topProdutos }: { evoData: EvoRow[]; topProdutos: ProdutoTop[] }) {
  return (
    <div className="space-y-4">
      <EvolucaoMensal
        meses={evoData.map((d) => ({
          rotulo: d.mes,
          faturamento: d.total,
          custoVariavel: d.total - d.lucro,
          margem: d.lucro,
        }))}
      />
      <TopProdutos produtos={topProdutos} />
    </div>
  );
}
