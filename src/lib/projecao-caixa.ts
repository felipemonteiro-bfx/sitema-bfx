/**
 * Projeção de caixa das obrigações (spec §6) — pura, dia a dia, de hoje até hoje + `dias`.
 *
 * - saídas: saldo dos boletos vivos não pagos, no vencimento;
 * - entradas: Pix esperado dos fechamentos e depósito previsto dos lotes em andamento;
 * - boleto vencido e não pago entra no dia de hoje;
 * - entrada com data já passada NÃO conta: é justamente o dinheiro que não chegou, e contar com
 *   ela esconderia o buraco (decisão de 2026-09-30). Quando chegar, vira caixa e sai da lista;
 * - o que cai depois do horizonte fica fora da série e dos cartões.
 *
 * `acumulado` = Σ saídas − Σ entradas até o dia, com piso 0: é só o que falta. O piso é aplicado
 * no valor exibido, não no saldo corrido — uma entrada anterior continua cobrindo saída posterior.
 * Contas em centavos inteiros. Valor não numérico (NaN, infinito) é descartado; `dias` inválido
 * vira 0 (só hoje).
 *
 * `hoje` é lido pelo dia UTC: a tela passa a data pura do dia em Manaus,
 * `new Date(hojeDataPura() + "T00:00:00.000Z")` — `new Date()` cru vira o dia seguinte às 20h.
 */

export type Movimento = { data: Date; valor: number; tipo: "boleto" | "pix" | "deposito"; ref?: string };

export type ProjecaoCaixa = {
  serie: { data: string; acumulado: number }[];
  /** Boletos com vencimento antes do dia do Pix daquele mês (soma do saldo). */
  antesDoPix: number;
  /** Os demais: vencimento no dia do Pix ou depois, ou empresa sem dia de Pix. */
  depoisDoPix: number;
  boletosAntesDoPix: number;
  boletosDepoisDoPix: number;
  pico: { valor: number; data: string } | null;
  /** Quantidade de boletos com vencimento antes de hoje e saldo > 0 (entram no dia de hoje). */
  vencidos: number;
};

const DIA_MS = 86_400_000;
const centavos = (v: number) => Math.round(v * 100);
const diaUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const chave = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function projetarCaixa(entrada: {
  hoje: Date;
  dias: number;
  boletos: { vencimento: Date; saldo: number; dataPix: Date | null }[];
  pixEsperados: { data: Date; valor: number }[];
  depositosPrevistos: { data: Date; valor: number }[];
}): ProjecaoCaixa {
  const inicio = diaUtc(entrada.hoje);
  const dias = Number.isFinite(entrada.dias) ? Math.max(0, Math.floor(entrada.dias)) : 0;
  const fim = inicio + dias * DIA_MS;
  const efetivo = (d: Date) => Math.max(diaUtc(d), inicio);

  const movimentos: Movimento[] = [];
  let antes = 0;
  let depois = 0;
  let qtdAntes = 0;
  let qtdDepois = 0;
  let vencidos = 0;

  for (const b of entrada.boletos) {
    if (!Number.isFinite(b.saldo)) continue;
    const saldo = centavos(b.saldo);
    if (saldo <= 0) continue;
    const venc = diaUtc(b.vencimento);
    if (venc < inicio) vencidos++;
    if (efetivo(b.vencimento) > fim) continue;
    movimentos.push({ data: b.vencimento, valor: saldo, tipo: "boleto" });
    if (b.dataPix && venc < diaUtc(b.dataPix)) {
      antes += saldo;
      qtdAntes++;
    } else {
      depois += saldo;
      qtdDepois++;
    }
  }
  for (const p of entrada.pixEsperados) {
    if (!Number.isFinite(p.valor) || diaUtc(p.data) < inicio) continue;
    movimentos.push({ data: p.data, valor: -centavos(p.valor), tipo: "pix" });
  }
  for (const dep of entrada.depositosPrevistos) {
    if (!Number.isFinite(dep.valor) || diaUtc(dep.data) < inicio) continue;
    movimentos.push({ data: dep.data, valor: -centavos(dep.valor), tipo: "deposito" });
  }

  // saldo líquido (saídas positivas, entradas negativas) por dia do horizonte
  const porDia = new Map<number, number>();
  for (const m of movimentos) {
    const dia = efetivo(m.data);
    if (dia > fim) continue;
    porDia.set(dia, (porDia.get(dia) ?? 0) + m.valor);
  }

  const serie: ProjecaoCaixa["serie"] = [];
  let corrido = 0;
  let pico: { centavos: number; dia: number } | null = null;
  for (let dia = inicio; dia <= fim; dia += DIA_MS) {
    corrido += porDia.get(dia) ?? 0;
    const falta = Math.max(0, corrido);
    serie.push({ data: chave(dia), acumulado: falta / 100 });
    if (falta > 0 && (!pico || falta > pico.centavos)) pico = { centavos: falta, dia };
  }

  return {
    serie,
    antesDoPix: antes / 100,
    depoisDoPix: depois / 100,
    boletosAntesDoPix: qtdAntes,
    boletosDepoisDoPix: qtdDepois,
    pico: pico ? { valor: pico.centavos / 100, data: chave(pico.dia) } : null,
    vencidos,
  };
}
