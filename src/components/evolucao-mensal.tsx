import { BarChart3 } from "lucide-react";
import { EmptyStateInline } from "@/components/ui/empty-state";
import { montarColunas, rotuloMil, type MesEvolucao } from "@/lib/grafico-escala";
import { cn, formatBRL } from "@/lib/utils";

/**
 * Evolução mensal do Início (redesign Vantage). Componente de SERVIDOR: nenhum JS de
 * animação nem de hover. Tooltip e destaque da coluna saem de `:hover`, `:focus-within`
 * e `:has()`, então funciona igual sem JavaScript e com o teclado (cada coluna é focável).
 *
 * Cada barra soma o faturamento: trecho hachurado = custo variável, topo verde = margem
 * de contribuição. Com margem negativa não há topo verde (o custo passou do faturamento).
 */
export type MesEvolucaoProps = MesEvolucao & {
  /** "mai/2026": usado no aria-label e no título da dica. Sem ele vale `rotulo`. */
  rotuloCompleto?: string;
};

export type EvolucaoMensalProps = {
  /** Do mais antigo ao mais recente, normalmente os últimos 6 meses. */
  meses: MesEvolucaoProps[];
  className?: string;
};

// A hachura vem dos tokens (muda com o tema); o 135deg e os passos são os do artboard.
const HACHURA = "repeating-linear-gradient(135deg, var(--hachura-traco) 0 2px, var(--hachura-fundo) 2px 6px)";
// Grade de pontos sutil atrás das colunas.
const GRADE = "radial-gradient(var(--grafico-trilha) 1px, transparent 1px)";

type Ancora = "esquerda" | "centro" | "direita";

/** Primeiras colunas alinham a dica à esquerda, últimas à direita: no celular ela não sai da tela. */
function ancora(indice: number, total: number): Ancora {
  const f = total > 1 ? indice / (total - 1) : 0;
  return f < 1 / 3 ? "esquerda" : f > 2 / 3 ? "direita" : "centro";
}

const CLASSE_ANCORA: Record<Ancora, string> = {
  esquerda: "left-0",
  centro: "left-1/2 -translate-x-1/2",
  direita: "right-0",
};

function Linha({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-texto-secundario">{nome}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}

export function EvolucaoMensal({ meses, className }: EvolucaoMensalProps) {
  const { ticks, colunas } = montarColunas(meses, 100);
  const total = meses.length;

  return (
    <section
      aria-labelledby="evolucao-mensal-titulo"
      className={cn("rounded-painel border border-border bg-card p-2", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-5 pt-4">
        <div>
          <h2 id="evolucao-mensal-titulo" className="text-lg font-semibold">
            Evolução mensal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{total > 1 ? `Últimos ${total} meses` : "Mês"} · faturamento e custo</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-texto-secundario">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: HACHURA }} aria-hidden="true" />
            Custo
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-primary" aria-hidden="true" />
            Margem
          </span>
        </div>
      </div>

      <div className="rounded-interno bg-poco px-3 pb-4 pt-6 sm:px-5">
        {total === 0 ? (
          <EmptyStateInline message="Sem dados suficientes para histórico" icon={BarChart3} />
        ) : (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            {/* Eixo Y: rótulos de valor, desfocados no modo discreto. */}
            <div
              aria-hidden="true"
              className="bloco-sensivel flex h-72 flex-col-reverse justify-between text-right font-mono text-xs text-muted-foreground"
            >
              {ticks.map((t) => (
                <span key={t}>{rotuloMil(t)}</span>
              ))}
            </div>

            <div className="min-w-0">
              <div className="relative h-72">
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ backgroundImage: GRADE, backgroundSize: "16px 16px", backgroundPosition: "0 6px" }}
                />
                {/* As outras colunas esmaecem quando uma recebe o mouse ou o foco (:has, só CSS). */}
                <ol
                  aria-label="Faturamento por mês"
                  className="bloco-sensivel relative flex h-full items-stretch gap-2 sm:gap-4 lg:gap-6 [&:has([data-evo-col]:focus-within)_[data-evo-col]:not(:focus-within)_[data-evo-barra]]:opacity-45 [&:has([data-evo-col]:hover)_[data-evo-col]:not(:hover)_[data-evo-barra]]:opacity-45"
                >
                  {colunas.map((c) => {
                    const m = meses[c.indice];
                    const nome = m.rotuloCompleto ?? m.rotulo;
                    const posicao = ancora(c.indice, total);
                    return (
                      <li
                        key={c.indice}
                        tabIndex={0}
                        aria-label={`${nome}: faturamento ${formatBRL(m.faturamento)}, custo ${formatBRL(m.custoVariavel)}, margem ${formatBRL(m.margem)}`}
                        data-evo-col=""
                        className="group/col relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Trilha de fundo da coluna em foco. */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-[18%] inset-y-0 rounded-md bg-grafico-trilha opacity-0 transition-opacity duration-(--mov-hover) group-hover/col:opacity-100 group-focus-within/col:opacity-100 motion-reduce:transition-none"
                        />
                        <div
                          aria-hidden="true"
                          data-evo-barra=""
                          className="relative flex h-full w-[64%] max-w-14 flex-col-reverse transition-opacity duration-(--mov-hover) motion-reduce:transition-none"
                        >
                          {c.vazio ? (
                            <span className="h-0.5 rounded-sm bg-grafico-trilha" />
                          ) : (
                            <>
                              <span
                                className="anim-barra block rounded-sm"
                                style={{ height: `${c.custoPct}%`, background: HACHURA, "--i": c.indice } as React.CSSProperties}
                              />
                              {!c.negativa && c.margemPct > 0 && (
                                <span
                                  className="anim-barra block min-h-1 rounded-sm bg-primary"
                                  style={
                                    {
                                      height: `${c.margemPct}%`,
                                      // Fio da cor do poço entre o custo e o topo verde.
                                      boxShadow: "0 2px 0 0 var(--poco)",
                                      "--i": c.indice,
                                    } as React.CSSProperties
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>
                        <div
                          role="tooltip"
                          aria-hidden="true"
                          className={cn(
                            "anim-dica pointer-events-none absolute z-10 hidden w-52 space-y-2 rounded-xl border border-vidro-borda bg-vidro p-3 text-sm shadow-lg backdrop-blur-md group-hover/col:block group-focus-within/col:block",
                            CLASSE_ANCORA[posicao]
                          )}
                          style={{ bottom: `min(calc(${c.totalPct}% + 12px), calc(100% - 9rem))` }}
                        >
                          <span className="block font-mono text-texto-secundario">{nome}</span>
                          <Linha nome="Faturamento">{formatBRL(m.faturamento)}</Linha>
                          <Linha nome="Custo">{formatBRL(m.custoVariavel)}</Linha>
                          <Linha nome="Margem">
                            <span className={c.negativa ? "text-error-text" : "text-success-text"}>{formatBRL(m.margem)}</span>
                          </Linha>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div aria-hidden="true" className="mt-3 flex gap-2 font-mono text-xs text-muted-foreground sm:gap-4 lg:gap-6">
                {meses.map((m) => (
                  <span key={m.rotulo} className="min-w-0 flex-1 text-center">
                    {m.rotulo}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
