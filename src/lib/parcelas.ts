import { calcularPrimeiroVencimento } from "@/lib/utils";
import type { RegraVencimento } from "@/lib/regra-empresa";

export const VALOR_PARCELA_MIN = 200; // parcela mínima (configurável)
export const VALOR_PARCELA_MAX = 475; // parcela máxima / teto (configurável)

/**
 * Sugere o número de parcelas para vendas com desconto em folha.
 * Garante que nenhuma parcela exceda VALOR_PARCELA_MAX.
 * Apenas para uso quando descontoEmFolha === true.
 */
export function sugerirParcelasDescontoEmFolha(valorTotal: number, maxParcelas = 12): number {
  if (valorTotal <= 0) return 1;
  return Math.min(maxParcelas, Math.max(1, Math.ceil(valorTotal / VALOR_PARCELA_MAX)));
}

/**
 * `valorParcela` depois de editar a venda. Recalcula com a mesma conta de `criarVendaV2`
 * só quando o número de parcelas ou o total mudou; senão devolve `undefined` e o campo
 * não é tocado. Recalcular sempre reescreveria, num save sem mudança, o valor de venda
 * importada ou legada que não é `total / parcelas` (juros embutidos).
 */
export function valorParcelaAposEdicao(input: {
  antes: { parcelas: number | null; total: number } | null;
  /** `total: null` = o form não trouxe como saber o total (sem itens e sem `valor`). */
  depois: { parcelas: number; total: number | null };
}): number | undefined {
  const { antes, depois } = input;
  if (!antes || depois.total == null) return undefined;
  const mudouParcelas = (antes.parcelas ?? 1) !== depois.parcelas;
  const mudouTotal = Math.abs(antes.total - depois.total) >= 0.01;
  if (!mudouParcelas && !mudouTotal) return undefined;
  return depois.parcelas > 0 ? Math.trunc((depois.total / depois.parcelas) * 100) / 100 : 0;
}

/**
 * A linha de `parcelas_vencimento` da venda em desconto em folha em 1x (2026-09-17). A venda
 * rápida e a edição só geravam linhas com mais de uma parcela: a venda em 1x ficava sem baixa,
 * sem antecipação e fora da fila da Prudent. Vencimento pela regra da criação
 * (`calcularPrimeiroVencimento`), valor = total em centavos. Fora da folha, nenhuma linha.
 * Ver docs/superpowers/specs/2026-09-17-parcela-venda-folha-1x.md.
 */
/**
 * As linhas de `parcelas_vencimento` que a venda rápida grava. Puro, para a regra ser testável
 * (a action importa Asaas, WhatsApp e e-mail e não roda em teste). Datas informadas no formulário
 * mandam; sem elas, parcelada gera uma por mês no dia de vencimento da regra da empresa (default
 * dia 10, corte 20) em UTC com o valor truncado que o cabeçalho também grava, e 1x cai em
 * `parcelaUnicaDaFolha`.
 */
export function parcelasDaVendaRapida(input: {
  informadas?: { numeroParcela: number; dataVencimento: string | Date; valorParcela: number }[];
  parcelas: number;
  dataVenda: Date;
  total: number;
  emFolha: boolean;
  regra?: RegraVencimento;
}): { numeroParcela: number; dataVencimento: Date; valorParcela: number }[] {
  const { informadas, parcelas, dataVenda, total, emFolha, regra } = input;
  if (informadas && informadas.length > 0) {
    return informadas.map((p) => ({
      numeroParcela: p.numeroParcela,
      dataVencimento: new Date(p.dataVencimento),
      valorParcela: p.valorParcela,
    }));
  }
  if (parcelas > 1) {
    const primeiro = calcularPrimeiroVencimento(dataVenda, regra);
    const diaVencimento = regra?.diaVencimento ?? 10;
    const valorParcela = Math.trunc((total / parcelas) * 100) / 100;
    return Array.from({ length: parcelas }, (_, i) => ({
      numeroParcela: i + 1,
      // UTC como o resto da regra (`calcularPrimeiroVencimento`, a planilha da folha e a
      // migração): com o construtor local, um servidor a leste do meridiano gravaria dia 9.
      dataVencimento: new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + i, diaVencimento)),
      valorParcela,
    }));
  }
  return parcelaUnicaDaFolha({ emFolha, dataVenda, total, regra });
}

export function parcelaUnicaDaFolha(input: {
  emFolha: boolean;
  dataVenda: Date;
  total: number;
  regra?: RegraVencimento;
}): { numeroParcela: number; dataVencimento: Date; valorParcela: number }[] {
  const centavos = Math.round(input.total * 100);
  if (!input.emFolha || !(centavos > 0) || Number.isNaN(input.dataVenda.getTime())) return [];
  return [{ numeroParcela: 1, dataVencimento: calcularPrimeiroVencimento(input.dataVenda, input.regra), valorParcela: centavos / 100 }];
}
