/**
 * Conciliação boletos Prudent × demonstrativo do fechamento e estado final derivado
 * (spec 2026-09-30 §5.2 e §6). Pura, sem banco.
 *
 * Um boleto é de um lote (uma empresa) e de um vencimento (uma competência), então toda parcela
 * de um boleto deveria estar no demonstrativo daquela empresa/competência. Quem chama passa as
 * linhas da versão vigente e os boletos da empresa com vencimento na competência (inclusive os
 * que não cobrem nenhuma linha). Substituídos e cancelados são ignorados.
 *
 * Dinheiro em centavos inteiros; tolerância de 1 centavo.
 */

import { STATUS_BOLETO, valorDoBoleto } from "@/lib/boleto-prudent";

export type Divergencia =
  | { tipo: "antecipada_sem_boleto"; identificador: string; valor: number }
  | { tipo: "boleto_valor_diferente"; boletoId: number; esperado: number; documento: number }
  | { tipo: "boleto_com_parcela_fora"; boletoId: number; identificador: string; valor: number };

type LinhaConciliacao = {
  identificador: string;
  parcelaId: number | null;
  antecipada: boolean;
  boletoPrudentId: number | null;
  valor: number;
};

type BoletoConciliacao = {
  id: number;
  status: string;
  valorEsperado: number;
  valorDocumento: number | null;
  parcelaIds: number[];
};

const TOLERANCIA_CENTAVOS = 1;

const centavos = (v: number) => Math.round(v * 100);

const vivo = (b: { status: string }) =>
  b.status !== STATUS_BOLETO.substituido && b.status !== STATUS_BOLETO.cancelado;

/**
 * Liga cada linha antecipada a um boleto vivo: pela parcela atual (`parcelaIds` do boleto) ou,
 * quando a linha perdeu a parcela (a edição da venda recria as parcelas), pelo `boletoPrudentId`
 * gravado na foto.
 */
export function conciliarBoletosComDemonstrativo(
  linhas: LinhaConciliacao[],
  boletos: BoletoConciliacao[],
): { somaLinhasAntecipadas: number; somaBoletos: number; diferenca: number; divergencias: Divergencia[] } {
  const vivos = boletos.filter(vivo);
  const antecipadas = linhas.filter((l) => l.antecipada);

  const boletoDaParcela = new Map<number, number>();
  for (const b of vivos) for (const pid of b.parcelaIds) if (!boletoDaParcela.has(pid)) boletoDaParcela.set(pid, b.id);
  const idsVivos = new Set(vivos.map((b) => b.id));

  // boletoId → linhas antecipadas cobertas; e quantas casaram só pela foto (sem parcela).
  const cobertas = new Map<number, { centavos: number; parcelaIds: Set<number>; pelaFoto: number }>();
  const cobertura = (id: number) => {
    const c = cobertas.get(id) ?? { centavos: 0, parcelaIds: new Set<number>(), pelaFoto: 0 };
    cobertas.set(id, c);
    return c;
  };

  const divergencias: Divergencia[] = [];
  for (const l of antecipadas) {
    const boletoId =
      l.parcelaId != null
        ? boletoDaParcela.get(l.parcelaId)
        : l.boletoPrudentId != null && idsVivos.has(l.boletoPrudentId)
          ? l.boletoPrudentId
          : undefined;
    if (boletoId == null) {
      divergencias.push({ tipo: "antecipada_sem_boleto", identificador: l.identificador, valor: l.valor });
      continue;
    }
    const c = cobertura(boletoId);
    c.centavos += centavos(l.valor);
    if (l.parcelaId != null) c.parcelaIds.add(l.parcelaId);
    else c.pelaFoto += 1;
  }

  const identificadorDaParcela = new Map<number, string>();
  for (const l of linhas) if (l.parcelaId != null) identificadorDaParcela.set(l.parcelaId, l.identificador);

  for (const b of vivos) {
    const c = cobertas.get(b.id) ?? { centavos: 0, parcelaIds: new Set<number>(), pelaFoto: 0 };
    const documentoC = centavos(valorDoBoleto(b));
    const semLinha = b.parcelaIds.filter((pid) => !c.parcelaIds.has(pid));
    // Linhas que casaram pela foto respondem por parcelas recriadas, que não têm id conhecido.
    if (semLinha.length > c.pelaFoto) {
      divergencias.push({
        tipo: "boleto_com_parcela_fora",
        boletoId: b.id,
        identificador: semLinha.map((pid) => identificadorDaParcela.get(pid) ?? `parcela #${pid}`).join(", "),
        valor: (documentoC - c.centavos) / 100,
      });
    } else if (Math.abs(documentoC - c.centavos) > TOLERANCIA_CENTAVOS) {
      divergencias.push({ tipo: "boleto_valor_diferente", boletoId: b.id, esperado: c.centavos / 100, documento: documentoC / 100 });
    }
  }

  const somaLinhasC = antecipadas.reduce((s, l) => s + centavos(l.valor), 0);
  const somaBoletosC = vivos.reduce((s, b) => s + centavos(valorDoBoleto(b)), 0);
  return {
    somaLinhasAntecipadas: somaLinhasC / 100,
    somaBoletos: somaBoletosC / 100,
    diferenca: (somaBoletosC - somaLinhasC) / 100,
    divergencias,
  };
}

/**
 * Conciliado = fechamento `pago` ∧ todo boleto vivo das linhas `pago` ∧ nenhuma linha antecipada
 * sem boleto. Concluído = conciliado ∧ nenhuma divergência.
 */
export function estadoFinal(
  f: { status: string },
  boletosDasLinhas: { status: string }[],
  divergencias: Divergencia[],
): { conciliado: boolean; concluido: boolean } {
  const conciliado =
    f.status === "pago" &&
    boletosDasLinhas.filter(vivo).every((b) => b.status === STATUS_BOLETO.pago) &&
    !divergencias.some((d) => d.tipo === "antecipada_sem_boleto");
  return { conciliado, concluido: conciliado && divergencias.length === 0 };
}
