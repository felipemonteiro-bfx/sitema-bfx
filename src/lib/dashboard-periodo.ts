/**
 * Regras puras de período do Início (/dashboard). Datas como "AAAA-MM-DD" e contas em
 * UTC, o mesmo padrão da página: o filtro é um dia de calendário à meia-noite UTC.
 */

const DIA = 86_400_000;

function paraUtc(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, (m ?? 1) - 1, d ?? 1));
}

function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function ddmmaaaa(iso: string): string {
  return `${ddmm(iso)}/${iso.slice(0, 4)}`;
}

/** "01/10 — 06/10/2026"; se o período atravessa a virada do ano, o início leva o ano também. */
export function rotuloPeriodo(from: string, to: string): string {
  const inicio = from.slice(0, 4) === to.slice(0, 4) ? ddmm(from) : ddmmaaaa(from);
  return `${inicio} — ${ddmmaaaa(to)}`;
}

/** Verdadeiro só quando o período vai do dia 1 do mês de hoje até hoje (o selo "Mês em andamento"). */
export function ehMesEmAndamento(from: string, to: string, hoje: string): boolean {
  return from === `${hoje.slice(0, 7)}-01` && to === hoje;
}

export type PeriodoRapido = {
  label: string;
  from: string;
  to: string;
  href: string;
  ativo: boolean;
};

/**
 * Hoje / 7 dias / Mês / Trimestre como links: `from` e `to` vão na URL, junto do filtro de
 * vendedores (se houver), e o servidor refaz a página — funciona sem JavaScript.
 * `ativo` é o período cujo intervalo é exatamente o que está na tela.
 */
export function periodosRapidos(hoje: string, atual: { from: string; to: string }, vendors?: string): PeriodoRapido[] {
  const h = paraUtc(hoje);
  const primeiroDoMes = (deslocamento: number) => paraIso(new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() + deslocamento, 1)));
  const faixas = [
    { label: "Hoje", from: hoje },
    { label: "7 dias", from: paraIso(new Date(h.getTime() - 6 * DIA)) },
    { label: "Mês", from: primeiroDoMes(0) },
    { label: "Trimestre", from: primeiroDoMes(-2) },
  ];
  const vendedores = vendors ? `&vendors=${encodeURIComponent(vendors)}` : "";
  return faixas.map((f) => ({
    ...f,
    to: hoje,
    href: `/dashboard?from=${f.from}&to=${hoje}${vendedores}`,
    ativo: atual.from === f.from && atual.to === hoje,
  }));
}

export type MesRecente = {
  /** 1º dia do mês, 00:00 UTC. */
  inicio: Date;
  /** 1º dia do mês seguinte, exclusivo (para usar com `lt`). */
  fim: Date;
  /** "abr/26": cabe no eixo do gráfico. */
  rotulo: string;
  /** "abr/2026": aria-label e título da dica. */
  rotuloCompleto: string;
};

const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

/** Os últimos `n` meses até o de `hoje`, do mais antigo ao atual. */
export function mesesRecentes(hoje: Date, n = 6): MesRecente[] {
  const meses: MesRecente[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
    const nome = MES_CURTO.format(inicio).replace(".", "");
    const ano = String(inicio.getUTCFullYear());
    meses.push({ inicio, fim, rotulo: `${nome}/${ano.slice(2)}`, rotuloCompleto: `${nome}/${ano}` });
  }
  return meses;
}
