/**
 * Regras puras do Dashboard para "clientes que compraram" e a comparação com o
 * período anterior. Datas em UTC, fim exclusivo (mesma convenção de
 * `calcularMetricasPeriodo`).
 */

function menosUmMes(d: Date): Date {
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() - 1;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dia = Math.min(d.getUTCDate(), ultimoDia);
  return new Date(Date.UTC(ano, mes, dia, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
}

const DIA = 86_400_000;

/**
 * O mesmo intervalo um mês antes: 1–25/set → 1–25/ago. Recua o ÚLTIMO DIA do
 * período (o fim é exclusivo), para 1–30/mai virar 1–30/abr e não 1–29/abr;
 * dia inexistente cai no último do mês.
 */
export function periodoAnteriorComparavel(inicio: Date, fim: Date): { inicio: Date; fim: Date } {
  return { inicio: menosUmMes(inicio), fim: new Date(menosUmMes(new Date(fim.getTime() - DIA)).getTime() + DIA) };
}

/** Diferença absoluta e percentual (2 casas); sem base, percentual null. */
export function variacao(atual: number, anterior: number): { diferenca: number; percentual: number | null } {
  const diferenca = Math.round((atual - anterior) * 100) / 100;
  if (!anterior) return { diferenca, percentual: null };
  // |anterior|: com base negativa (prejuízo), melhorar tem de dar percentual positivo.
  return { diferenca, percentual: Math.round(((atual - anterior) / Math.abs(anterior)) * 10000) / 100 };
}

/**
 * Clientes distintos entre as vendas do período; "novo" é quem teve a
 * primeira compra da vida dentro de [inicio, fim).
 */
export function contarClientes(
  vendas: { clienteId: number }[],
  primeiraCompra: Map<number, Date>,
  inicio: Date,
  fim: Date
): { total: number; novos: number; recorrentes: number } {
  const ids = new Set(vendas.map((v) => v.clienteId));
  let novos = 0;
  for (const id of ids) {
    const p = primeiraCompra.get(id);
    if (p && p >= inicio && p < fim) novos++;
  }
  return { total: ids.size, novos, recorrentes: ids.size - novos };
}

/** "YYYY-MM-DD" do último dia de um período com fim exclusivo (26/09 00:00 → "2026-09-25"). */
export function ultimoDiaDoPeriodo(fimExclusivo: Date): string {
  return new Date(fimExclusivo.getTime() - DIA).toISOString().slice(0, 10);
}
