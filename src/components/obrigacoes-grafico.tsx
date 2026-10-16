import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";

/**
 * Projeção de caixa em degraus (Fase 4): quanto a BFX precisa pôr do próprio bolso em cada dia
 * dos próximos 60. O SVG estica na largura (`preserveAspectRatio="none"`, traço sem escala); os
 * rótulos ficam em HTML por cima, posicionados em %, para não encolherem no celular.
 */
type Props = {
  serie: { data: string; acumulado: number }[];
  pico: { valor: number; data: string } | null;
  diasPix: string[];
  vencidos: number;
};

const L = 1000;
const A = 160;
const TOPO = 12;
const ddmm = (s: string) => s.slice(5).split("-").reverse().join("/");

function caminho(serie: Props["serie"], max: number): string {
  if (serie.length === 0) return "";
  const passo = serie.length > 1 ? L / (serie.length - 1) : L;
  const y = (v: number) => (max > 0 ? A - (v / max) * (A - TOPO) : A);
  let d = `M0 ${y(serie[0].acumulado).toFixed(1)}`;
  for (let i = 1; i < serie.length; i++) {
    d += ` H${(i * passo).toFixed(1)} V${y(serie[i].acumulado).toFixed(1)}`;
  }
  return d;
}

export default function ObrigacoesGrafico({ serie, pico, diasPix, vencidos }: Props) {
  const max = Math.max(0, ...serie.map((p) => p.acumulado));
  const linha = caminho(serie, max);
  const posicao = (data: string) => {
    const i = serie.findIndex((p) => p.data === data);
    return serie.length > 1 && i >= 0 ? (i / (serie.length - 1)) * 100 : 0;
  };
  const resumo = pico
    ? `Projeção de 60 dias: maior necessidade de caixa de ${formatBRL(pico.valor)} em ${ddmm(pico.data)}.`
    : "Projeção de 60 dias: os boletos da BFX estão cobertos em todos os dias.";

  return (
    <Card className="p-2 pt-5">
      <section aria-labelledby="obrigacoes-projecao" className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4">
          <h2 id="obrigacoes-projecao" className="text-lg font-semibold text-foreground">
            Capital próprio necessário, dia a dia
          </h2>
          <span className="text-sm text-muted-foreground">
            boletos a pagar − Pix esperados − depósitos previstos da Prudent
          </span>
        </div>

        <figure className="relative m-0 rounded-interno bg-poco px-4 pb-3 pt-10">
          {pico && (
            <span
              className="absolute top-3 -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-error-text"
              style={{ left: `${Math.min(88, Math.max(12, posicao(pico.data)))}%` }}
            >
              pico <span className="valor-sensivel">{formatBRL(pico.valor)}</span> · {ddmm(pico.data)}
            </span>
          )}
          <svg
            viewBox={`0 0 ${L} ${A}`}
            preserveAspectRatio="none"
            className="h-40 w-full overflow-visible"
            role="img"
            aria-label={resumo}
          >
            <line x1="0" y1={A} x2={L} y2={A} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {diasPix.map((d) => {
              const x = (posicao(d) / 100) * L;
              return (
                <line
                  key={d}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2={A}
                  className="stroke-primary"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {max > 0 && (
              <>
                <path d={`${linha} V${A} H0 Z`} className="fill-error/10" />
                <path
                  d={linha}
                  fill="none"
                  className="stroke-error"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>
          {!pico && (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted-foreground">
              Nenhum dia sem cobertura nos próximos 60 dias.
            </p>
          )}
          {diasPix.length > 0 && (
            <div className="relative mt-1 h-4" aria-hidden="true">
              {diasPix.map((d) => (
                <span
                  key={d}
                  className="absolute -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground"
                  style={{ left: `${Math.min(94, Math.max(6, posicao(d)))}%` }}
                >
                  Pix {ddmm(d)}
                </span>
              ))}
            </div>
          )}
          <figcaption className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>hoje{vencidos > 0 ? ` (com ${vencidos} vencido${vencidos === 1 ? "" : "s"})` : ""}</span>
            <span>+60 dias</span>
          </figcaption>
        </figure>
      </section>
    </Card>
  );
}
