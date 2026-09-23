/**
 * Logica pura do relatorio mensal de vendas por empresa parceira.
 *
 * Duas responsabilidades testaveis e sem efeitos colaterais:
 *  - `resolverGruposEconomicos`: agrupa empresas vinculadas (grupos economicos)
 *    via union-find, elegendo uma empresa canonica por grupo para receber UM email.
 *  - `montarDadosRelatorio`: transforma vendas do periodo nas linhas + totais do
 *    relatorio (valor total, total via desconto em folha, cronograma de parcelas).
 *
 * A orquestracao com efeitos (query, PDF/XLSX, MinIO, email) vive na rota cron
 * `src/app/api/cron/relatorio-mensal/route.ts`, que reusa estas funcoes.
 */
import { valorTotalVenda, produtosTexto } from "@/lib/venda-utils";
import { formatBRL, formatDateBR } from "@/lib/utils";
import {
  FORMA_PAGAMENTO,
  formaFromLegacyFlags,
  type FormaPagamento,
} from "@/lib/forma-pagamento";

export type EmpresaLite = {
  id: number;
  nome: string;
  emailRh: string | null;
  emailsExtras: string | null;
  telefoneRh: string | null;
  /** Cc de todo e-mail ao RH (ver `@/lib/email-copia`). */
  emailCopia?: string | null;
};

export type VinculoLite = {
  empresaId: number;
  vinculadaId: number;
};

export type GrupoEconomico = {
  /** Empresa que recebe o email consolidado (tem emailRh; desempate por menor id). */
  canonica: EmpresaLite;
  /** Todas as empresas do grupo (inclui a canonica). */
  empresas: EmpresaLite[];
  /** Ids de todas as empresas do grupo (para o filtro de clientes). */
  empresaIds: number[];
  /** E-mails deduplicados de todas as empresas do grupo. */
  emails: string[];
};

/**
 * Agrupa empresas por grupo economico usando os vinculos (bidirecionais) como
 * arestas de um union-find. Cada grupo elege uma empresa canonica: a primeira
 * (menor id) que tiver `emailRh`; se nenhuma tiver, a de menor id.
 */
export function resolverGruposEconomicos(
  empresas: EmpresaLite[],
  vinculos: VinculoLite[]
): GrupoEconomico[] {
  const parent = new Map<number, number>();
  for (const e of empresas) parent.set(e.id, e.id);

  const find = (x: number): number => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // path compression
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };

  const union = (a: number, b: number) => {
    if (!parent.has(a) || !parent.has(b)) return; // ignora vinculo orfao
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // mantem a raiz de menor id como representante (estabilidade)
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  };

  for (const v of vinculos) union(v.empresaId, v.vinculadaId);

  const gruposPorRaiz = new Map<number, EmpresaLite[]>();
  for (const e of empresas) {
    const raiz = find(e.id);
    const lista = gruposPorRaiz.get(raiz);
    if (lista) lista.push(e);
    else gruposPorRaiz.set(raiz, [e]);
  }

  const grupos: GrupoEconomico[] = [];
  for (const lista of gruposPorRaiz.values()) {
    const ordenadas = [...lista].sort((a, b) => a.id - b.id);
    const canonica = ordenadas.find((e) => !!e.emailRh) ?? ordenadas[0]!;

    const emails: string[] = [];
    for (const e of ordenadas) {
      if (e.emailRh) emails.push(e.emailRh.trim());
      if (e.emailsExtras) {
        for (const extra of e.emailsExtras.split(",")) {
          const t = extra.trim();
          if (t) emails.push(t);
        }
      }
    }
    const emailsUnicos = [...new Set(emails.filter(Boolean))];

    grupos.push({
      canonica,
      empresas: ordenadas,
      empresaIds: ordenadas.map((e) => e.id),
      emails: emailsUnicos,
    });
  }

  // ordena grupos pelo id da empresa canonica (determinismo)
  return grupos.sort((a, b) => a.canonica.id - b.canonica.id);
}

export type VendaRelatorioMensal = {
  id: number;
  dataVenda: Date;
  parcelas?: number | null;
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
  boleto?: boolean | null;
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
  itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
  parcelasVencimento?: { numeroParcela: number; dataVencimento: Date; valorParcela: number }[];
  cliente?: {
    id?: number | null;
    nome?: string | null;
    cpf?: string | null;
    matricula?: string | null;
    empresa?: string | null;
  } | null;
};

export type LinhaRelatorioMensal = {
  colaborador: string;
  matricula: string;
  data: string;
  produtos: string;
  valor: number;
  formaPagamento: FormaPagamento;
  descontoEmFolha: boolean;
  parcelasTexto: string;
  parcelas: { numero: number; vencimento: string; valor: number }[];
};

export type RelatorioMensalData = {
  linhas: LinhaRelatorioMensal[];
  totalVendas: number;
  valorTotal: number;
  /** Soma do valor das vendas via desconto em folha (o que sera descontado da folha). */
  totalDescontoFolha: number;
};

/** Resolve a forma de pagamento canonica de uma venda (com fallback legado). */
export function formaDaVenda(v: VendaRelatorioMensal): FormaPagamento {
  if (v.formaPagamento) return v.formaPagamento as FormaPagamento;
  return formaFromLegacyFlags({
    descontoEmFolha: v.descontoEmFolha ?? undefined,
    boleto: v.boleto ?? undefined,
    parcelas: v.parcelas ?? undefined,
  });
}

/** Monta o texto do cronograma de parcelas para exibicao ("3x de R$ ... — venc. ..."). */
function parcelasTexto(v: VendaRelatorioMensal): string {
  const parcelas = v.parcelasVencimento ?? [];
  if (parcelas.length === 0) {
    const n = v.parcelas ?? 1;
    return `${n}x`;
  }
  const ordenadas = [...parcelas].sort((a, b) => a.numeroParcela - b.numeroParcela);
  const valor = ordenadas[0]!.valorParcela;
  const datas = ordenadas.map((p) => formatDateBR(p.dataVencimento)).join(", ");
  return `${ordenadas.length}x de ${formatBRL(valor)} — venc. ${datas}`;
}

/**
 * Transforma as vendas do periodo nas linhas + totais do relatorio.
 * `valorTotal` = soma de todas as vendas; `totalDescontoFolha` = soma apenas
 * das vendas via desconto em folha (o montante a ser descontado da folha).
 */
export function montarDadosRelatorio(vendas: VendaRelatorioMensal[]): RelatorioMensalData {
  const linhas: LinhaRelatorioMensal[] = vendas.map((v) => {
    const forma = formaDaVenda(v);
    const descontoEmFolha = forma === FORMA_PAGAMENTO.DESCONTO_FOLHA;
    const valor = valorTotalVenda(v);
    const parcelas = [...(v.parcelasVencimento ?? [])]
      .sort((a, b) => a.numeroParcela - b.numeroParcela)
      .map((p) => ({
        numero: p.numeroParcela,
        vencimento: formatDateBR(p.dataVencimento),
        valor: p.valorParcela,
      }));

    return {
      colaborador: v.cliente?.nome || "N/D",
      matricula: v.cliente?.matricula || "—",
      data: formatDateBR(v.dataVenda),
      produtos: produtosTexto(v),
      valor,
      formaPagamento: forma,
      descontoEmFolha,
      parcelasTexto: parcelasTexto(v),
      parcelas,
    };
  });

  const valorTotal = linhas.reduce((s, l) => s + l.valor, 0);
  const totalDescontoFolha = linhas
    .filter((l) => l.descontoEmFolha)
    .reduce((s, l) => s + l.valor, 0);

  return {
    linhas,
    totalVendas: linhas.length,
    valorTotal,
    totalDescontoFolha,
  };
}

/** Rotulo "julho/2026" a partir de um periodo "2026-07". */
export function periodoLabel(periodo: string): string {
  const [anoStr, mesStr] = periodo.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const nomeMes = meses[mes - 1] ?? mesStr;
  return `${nomeMes}/${ano}`;
}

/** Limites [inicio, fim] do mes de competencia a partir de "YYYY-MM" (horario local). */
export function periodoBoundaries(periodo: string): { inicio: Date; fim: Date } {
  const [anoStr, mesStr] = periodo.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr); // 1-12
  const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999); // dia 0 do mes seguinte = ultimo dia
  return { inicio, fim };
}

const MANAUS_TIME_ZONE = "America/Manaus";

/**
 * Limites UTC para o mes corrente ate o fim do dia da referencia em Manaus.
 * Manaus permanece em UTC-4, sem horario de verao.
 */
export function periodoAtualManausBoundaries(referencia: Date): { inicio: Date; fim: Date } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: MANAUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referencia);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value);
  const ano = valor("year");
  const mes = valor("month");
  const dia = valor("day");

  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1, 4, 0, 0, 0)),
    fim: new Date(Date.UTC(ano, mes - 1, dia + 1, 3, 59, 59, 999)),
  };
}

/** Periodo "YYYY-MM" do mes anterior a uma data de referencia. */
export function periodoMesAnterior(ref: Date): string {
  const ano = ref.getFullYear();
  const mes = ref.getMonth(); // 0-11; mes anterior em base 0 => mes atual-1
  const d = new Date(ano, mes - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
