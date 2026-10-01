/**
 * Estado do campo "Data do desconto" da venda 1x em folha (2026-10-01), fora do React para poder
 * ser testado (o vitest daqui não renderiza componente). Datas em "AAAA-MM-DD".
 *
 * O campo guarda só a ESCOLHA de quem vende: `null` = acompanha a data da regra da empresa (e
 * portanto muda junto com a data da venda ou com a regra); uma data = foi mudada à mão.
 * Ver docs/superpowers/specs/2026-10-01-data-desconto-venda-1x.md.
 */
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { parseDataIsoUtc } from "@/lib/data-input";
import type { RegraVencimento } from "@/lib/regra-empresa";
import { STATUS_FECHAMENTO } from "@/lib/fechamento";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Data do desconto pela regra da empresa (a mesma conta do servidor), ou `null` sem data da venda válida. */
export function dataDaRegraIso(dataVenda: string, regra?: RegraVencimento | null): string | null {
  const venda = parseDataIsoUtc(dataVenda);
  if (!venda) return null;
  return calcularPrimeiroVencimento(venda, regra ?? undefined).toISOString().slice(0, 10);
}

/** A data que vale: a escolhida, ou a da regra quando não há escolha. */
export function dataDescontoEfetiva(escolhida: string | null, dataRegra: string | null): string | null {
  return escolhida ?? dataRegra;
}

/** Escolher a própria data da regra volta a acompanhar a regra. */
export function escolhaAposSelecionar(nova: string, dataRegra: string | null): string | null {
  return nova === dataRegra ? null : nova;
}

/** "2026-11-10" → "10/11/2026". */
export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Aviso de quando a data escolhida difere da regra: o desconto foge do combinado com o RH. Mês
 * diferente diz os meses (com o ano, se ele também mudou); mesmo mês diz os dias. Igual: `null`.
 */
export function avisoMudancaDataDesconto(escolhida: string, dataRegra: string): string | null {
  const e = parseDataIsoUtc(escolhida);
  const r = parseDataIsoUtc(dataRegra);
  if (!e || !r || e.getTime() === r.getTime()) return null;
  const mesmoAno = e.getUTCFullYear() === r.getUTCFullYear();
  if (mesmoAno && e.getUTCMonth() === r.getUTCMonth()) {
    return `Combine com o RH antes: o desconto muda do dia ${r.getUTCDate()} para o dia ${e.getUTCDate()}.`;
  }
  const mes = (d: Date) => (mesmoAno ? MESES[d.getUTCMonth()] : `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`);
  return (
    `Combine com o RH antes: a folha vai descontar em ${mes(e)}, não em ${mes(r)}. ` +
    "O resumo financeiro e a taxa da Prudent já usam a data nova."
  );
}

/**
 * Na edição, por que a data do desconto da parcela 1 não pode mudar — as mesmas travas que o
 * servidor aplica em `updateVenda` (boleto Prudent, fechamento conferido ou posterior, parcela
 * paga/antecipada ou num lote). `null` = editável. Com motivo, o campo aparece desabilitado e não
 * vai no formulário (o servidor mantém a data gravada).
 */
export function bloqueioDataDesconto(
  linha: {
    paga: boolean;
    antecipada: boolean;
    antecipacaoLoteId: number | null;
    boletoPrudentId: number | null;
    fechamento: { status: string } | null;
  } | null
): string | null {
  if (!linha) return null;
  if (linha.boletoPrudentId != null) return "A Prudent já emitiu o boleto desta parcela: a data não muda.";
  if (linha.fechamento && linha.fechamento.status !== STATUS_FECHAMENTO.emPreparacao) {
    return "A parcela está num fechamento já conferido: a data não muda.";
  }
  if (linha.paga || linha.antecipada) return "A parcela já está paga ou antecipada: a data não muda.";
  if (linha.antecipacaoLoteId != null) return "A parcela está num lote enviado à Prudent: a data não muda.";
  return null;
}
