/**
 * Filtros da tela de Boletos (período, empresa, busca). Módulo puro: datas são
 * strings "YYYY-MM-DD" do calendário (Manaus), como o Asaas devolve.
 */
export type PeriodoBoletos = "hoje" | "semana" | "mes" | "ano" | "tudo" | "pers";
export const PERIODOS_BOLETOS: PeriodoBoletos[] = ["hoje", "semana", "mes", "ano", "tudo", "pers"];

export const ROTULO_PERIODO_BOLETOS: Record<PeriodoBoletos, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
  tudo: "Desde o início",
  pers: "Personalizado",
};

export type FiltroBoletos = { periodo: PeriodoBoletos; de?: string; ate?: string; empresa?: string; q: string };
export type Intervalo = { de: string | null; ate: string | null };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const data = (v: string | undefined) => (v && DATA.test(v) ? v : undefined);

export function lerFiltroBoletos(sp: { periodo?: string; de?: string; ate?: string; empresa?: string; q?: string }): FiltroBoletos {
  const periodo = PERIODOS_BOLETOS.includes(sp.periodo as PeriodoBoletos) ? (sp.periodo as PeriodoBoletos) : "mes";
  return {
    periodo,
    de: periodo === "pers" ? data(sp.de) : undefined,
    ate: periodo === "pers" ? data(sp.ate) : undefined,
    empresa: sp.empresa?.trim() || undefined,
    q: (sp.q ?? "").trim().toLowerCase(),
  };
}

function iso(ano: number, mes: number, dia: number): string {
  return new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);
}

/** Intervalo inclusivo do período; `null` = sem limite (desde o início). */
export function intervaloDoPeriodo(f: Pick<FiltroBoletos, "periodo" | "de" | "ate">, hoje: string): Intervalo | null {
  const [a, m, d] = hoje.split("-").map(Number);
  switch (f.periodo) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "semana": {
      const diaSemana = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7; // segunda = 0
      return { de: iso(a, m - 1, d - diaSemana), ate: iso(a, m - 1, d - diaSemana + 6) };
    }
    case "mes":
      return { de: iso(a, m - 1, 1), ate: iso(a, m, 0) };
    case "ano":
      return { de: `${a}-01-01`, ate: `${a}-12-31` };
    case "tudo":
      return null;
    case "pers":
      return { de: f.de ?? null, ate: f.ate ?? null };
  }
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type BoletoFiltravel = { dueDate: string; paymentDate?: string; description?: string; externalReference?: string };
type VendaDoBoleto = { cliente: string | null; empresa: string | null };

export function filtrarBoletos<T extends BoletoFiltravel>(
  boletos: T[],
  opcoes: { intervalo: Intervalo | null; campo: "dueDate" | "paymentDate"; empresa?: string; q: string },
  vendas: Map<string, VendaDoBoleto>
): T[] {
  const empresa = opcoes.empresa ? semAcento(opcoes.empresa) : null;
  const q = opcoes.q ? semAcento(opcoes.q) : "";
  return boletos.filter((b) => {
    if (opcoes.intervalo) {
      const dia = (opcoes.campo === "paymentDate" ? b.paymentDate : b.dueDate)?.slice(0, 10);
      if (!dia) return false;
      if (opcoes.intervalo.de && dia < opcoes.intervalo.de) return false;
      if (opcoes.intervalo.ate && dia > opcoes.intervalo.ate) return false;
    }
    const venda = b.externalReference ? vendas.get(b.externalReference) : undefined;
    if (empresa && semAcento(venda?.empresa ?? "") !== empresa) return false;
    if (q) {
      const texto = semAcento(`${b.description ?? ""} ${venda?.cliente ?? ""}`);
      if (!texto.includes(q)) return false;
    }
    return true;
  });
}
