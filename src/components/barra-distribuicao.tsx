import { cn } from "@/lib/utils";

export type ContagensAssinatura = { assinada: number; aguardando: number; semContrato: number; cancelada: number };

type Chave = keyof ContagensAssinatura;

export type SegmentoDistribuicao = { chave: Chave; rotulo: string; quantidade: number; pct: number };

const ORDEM: { chave: Chave; rotulo: string }[] = [
  { chave: "assinada", rotulo: "Assinada" },
  { chave: "aguardando", rotulo: "Aguardando assinatura" },
  { chave: "semContrato", rotulo: "Sem contrato" },
  { chave: "cancelada", rotulo: "Cancelada" },
];

/**
 * Percentuais inteiros que SOMAM 100 (método do maior resto). Sem vendas não há
 * o que distribuir: `vazio` fica true e todos os percentuais valem 0 (a barra
 * vira uma trilha neutra, sem NaN).
 */
export function calcularProporcoes(c: ContagensAssinatura): { total: number; vazio: boolean; segmentos: SegmentoDistribuicao[] } {
  const total = c.assinada + c.aguardando + c.semContrato + c.cancelada;
  if (total <= 0) {
    return { total: 0, vazio: true, segmentos: ORDEM.map((o) => ({ ...o, quantidade: 0, pct: 0 })) };
  }
  const brutos = ORDEM.map((o) => ({ ...o, quantidade: c[o.chave], exato: (c[o.chave] / total) * 100 }));
  const base = brutos.map((b) => Math.floor(b.exato));
  let faltam = 100 - base.reduce((s, n) => s + n, 0);
  const porResto = brutos
    .map((b, i) => ({ i, resto: b.exato - base[i] }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of porResto) {
    if (faltam <= 0) break;
    base[i] += 1;
    faltam -= 1;
  }
  return {
    total,
    vazio: false,
    segmentos: brutos.map((b, i) => ({ chave: b.chave, rotulo: b.rotulo, quantidade: b.quantidade, pct: base[i] })),
  };
}

// Cores só por token: assinada neutra, aguardando no verde da marca, sem contrato
// hachurado (o padrão diferencia sem depender da cor).
const COR_SEGMENTO: Record<Chave, string> = {
  assinada: "bg-muted-foreground",
  aguardando: "bg-marca-tint-texto",
  semContrato: "bg-hachura-fina",
  // Discreta e neutra: informa sem disputar atenção com assinada/aguardando.
  cancelada: "bg-divisoria",
};

/** "N vendas" + barra segmentada por status de assinatura + legenda com contagem. */
export function BarraDistribuicao({ contagens, className }: { contagens: ContagensAssinatura; className?: string }) {
  const { total, vazio, segmentos } = calcularProporcoes(contagens);
  const resumo = vazio
    ? "Nenhuma venda no filtro"
    : segmentos.map((s) => `${s.quantidade} ${s.rotulo.toLowerCase()}`).join(", ");

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <span className="text-base font-semibold">
        {total} {total === 1 ? "venda" : "vendas"}
      </span>
      <div
        role="img"
        aria-label={`Distribuição por assinatura: ${resumo}`}
        className="flex h-1.5 min-w-[160px] flex-1 basis-60 gap-1"
      >
        {vazio ? (
          <span className="h-full flex-1 rounded-full bg-poco" />
        ) : (
          segmentos
            .filter((s) => s.quantidade > 0)
            .map((s) => (
              <span
                key={s.chave}
                className={cn("h-full grow-(--g) basis-0 rounded-full", COR_SEGMENTO[s.chave])}
                style={{ "--g": s.pct } as React.CSSProperties}
              />
            ))
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-muted-foreground">
        {segmentos.map((s) => (
          <li key={s.chave} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-2.5 w-2.5 rounded-[3px]", COR_SEGMENTO[s.chave])}
            />
            {s.rotulo}
            <span className="font-mono tabular-nums text-foreground">{s.quantidade}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
