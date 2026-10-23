import { X } from "lucide-react";
import { urlSemFiltro, type FiltroAtivo } from "@/lib/historico-filtros";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Subtítulo do período do Histórico a partir de duas datas `AAAA-MM-DD`
 * (início e fim inclusivos): mês fechado vira "vendas de outubro de 2026",
 * qualquer outro intervalo mostra as duas datas.
 */
export function descreverPeriodo(from: string, to: string): string {
  const [a1, m1, d1] = from.split("-").map(Number);
  const [a2, m2, d2] = to.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a1, m1, 0)).getUTCDate();
  if (a1 === a2 && m1 === m2 && d1 === 1 && d2 === ultimoDia) {
    return `vendas de ${MESES[m1 - 1]} de ${a1}`;
  }
  return `vendas de ${dataBR(from)} a ${dataBR(to)}`;
}

/**
 * Chips dos filtros ativos. Cada chip é um `<a>` para a URL sem aquele filtro
 * (e sem `page`), então remover funciona sem JavaScript. O "×" tem 44px de área.
 */
export function FiltrosAtivos({
  filtros,
  searchParams,
}: {
  filtros: FiltroAtivo[];
  searchParams: Record<string, string | undefined>;
}) {
  if (filtros.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0" aria-label="Filtros ativos">
      {filtros.map((f) => (
        <li key={f.chave}>
          <a
            href={urlSemFiltro(searchParams, f.chave)}
            aria-label={`Remover filtro ${f.rotulo}: ${f.valor}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-controle border border-divisoria bg-poco pl-3.5 pr-0 text-sm text-muted-foreground transition-colors hover:bg-card-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true">
              {f.rotulo} <strong className="font-semibold text-foreground">{f.valor}</strong>
            </span>
            <span className="inline-flex size-11 items-center justify-center" aria-hidden="true">
              <X className="h-4 w-4" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
