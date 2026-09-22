/**
 * Planilha de controle da antecipação no formato da equipe (2026-09-11) — o
 * modelo, montado no servidor. O .xlsx sai de `@/lib/xlsx/planilha-controle-xlsx`.
 *
 * Medido na planilha "CONTROLE ATUALIZADO DE COMPRAS BFXSHOP - ESSÊNCIA DA
 * MODA": uma aba por mês de DESCONTO em folha. O sistema vence a parcela no
 * dia 10 do mês seguinte ao desconto (`calcularPrimeiroVencimento`), então a
 * aba é o mês do vencimento menos um. Sem campo de secretaria nem de cargo (o
 * André não quis criar): um bloco por empresa conveniada e CARGO vazio.
 */
import { parcelasDaVenda, type SituacaoParcela } from "@/lib/antecipacao-compradores";
import { chaveDoMes } from "@/lib/periodo-meses";

export type StatusPlanilha = "ANTECIPAÇÃO OK" | "PAGO" | "À VENCER" | "VENCIDA - CONFERIR REPASSE";

/** O formato que `SELECT_VENDA_PLANILHA` devolve do banco. */
export interface VendaParaPlanilha {
  id: number;
  status: string | null;
  antecipada: number | null;
  dataVenda: Date | string;
  produtoNome: string | null;
  itens: { produtoNome: string | null; quantidade: number | null }[];
  cliente: { nome: string | null; cpf: string | null; cnpj: string | null; empresa: string | null } | null;
  parcelasVencimento: {
    numeroParcela: number | null;
    dataVencimento: Date | string;
    valorParcela: number;
    antecipada: boolean;
    paga?: boolean;
    origemPagamento?: string | null;
  }[];
}

export interface LinhaPlanilha {
  nome: string;
  cpf: string;
  /** Sem campo no cadastro: sai vazio, como decidido. */
  cargo: "";
  /** YYYY-MM-DD. */
  dataCompra: string;
  produto: string;
  valor: number;
  /** "2/4". */
  parcela: string;
  /** Último dia do mês da aba, YYYY-MM-DD. */
  dataDesconto: string;
  status: StatusPlanilha;
}

export interface BlocoPlanilha {
  titulo: string;
  linhas: LinhaPlanilha[];
}

export interface AbaPlanilha {
  /** Mês do desconto, YYYY-MM. */
  mes: string;
  /** "SETEMBRO 2026". */
  nome: string;
  blocos: BlocoPlanilha[];
  /** Coluna K: o valor de cada parcela antecipada da aba, na ordem das linhas. */
  antecipados: number[];
}

export interface FiltroPlanilha {
  /** MM/AAAA, como o seletor de meses. */
  mesInicio?: string;
  mesFim?: string;
  empresa?: string;
  /** Padrão: true. Falso começa no mês de hoje. */
  incluirPassados?: boolean;
}

export interface ResumoPlanilha {
  abas: number;
  parcelas: number;
  valorAntecipado: number;
}

/** Mesmo recorte na rota do download e na ação do resumo. */
export const SELECT_VENDA_PLANILHA = {
  id: true,
  status: true,
  antecipada: true,
  dataVenda: true,
  produtoNome: true,
  itens: { select: { produtoNome: true, quantidade: true } },
  cliente: { select: { nome: true, cpf: true, cnpj: true, empresa: true } },
  parcelasVencimento: {
    select: { numeroParcela: true, dataVencimento: true, valorParcela: true, antecipada: true, paga: true, origemPagamento: true },
    orderBy: { numeroParcela: "asc" as const },
  },
};

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const STATUS: Record<SituacaoParcela, StatusPlanilha> = {
  antecipada: "ANTECIPAÇÃO OK",
  // Enviada à Prudent, sem retorno confirmado: para a planilha da equipe ainda é "À VENCER" —
  // só ANTECIPAÇÃO OK entra na coluna K (2026-09-17).
  em_andamento: "À VENCER",
  paga: "PAGO",
  a_antecipar: "À VENCER",
  // O sistema não sabe se a folha repassou (PAGO) ou não (PENDENTE DE REPASSE).
  vencida: "VENCIDA - CONFERIR REPASSE",
};

const SEM_EMPRESA = "SEM EMPRESA";
const comparar = new Intl.Collator("pt-BR").compare;

/** "2026-10-10" → "2026-09": vence dia 10 do mês seguinte ao desconto. */
export function mesDoDesconto(vencimento: string): string {
  const [ano, mes] = vencimento.slice(0, 7).split("-").map(Number);
  const total = ano * 12 + (mes - 1) - 1;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** "2026-09" → "SETEMBRO 2026". */
export function nomeDaAba(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${ano}`;
}

/** "2026-08" → "2026-08-31". */
export function ultimoDiaDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
}

/** CPF 000.000.000-00 ou CNPJ 00.000.000/0000-00; o que não tiver 11 ou 14 dígitos fica como veio. */
export function formatarDocumento(documento: string | null | undefined): string {
  if (!documento) return "";
  const d = documento.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return documento.trim();
}

/** O produto da linha: com vários itens, a lista ("2x VENTILADOR + FORNO 50L"). */
export function descreverProduto(venda: Pick<VendaParaPlanilha, "produtoNome" | "itens">): string {
  if (venda.itens.length > 1) {
    return venda.itens
      .map((i) => `${i.quantidade && i.quantidade > 1 ? `${i.quantidade}x ` : ""}${(i.produtoNome ?? "").trim()}`)
      .join(" + ");
  }
  return (venda.produtoNome ?? venda.itens[0]?.produtoNome ?? "").trim();
}

/** Filtro vindo da URL ou da ação: só texto; "todas" = sem filtro de empresa. */
export function normalizarFiltroPlanilha(entrada: {
  mesInicio?: unknown;
  mesFim?: unknown;
  empresa?: unknown;
  incluirPassados?: unknown;
}): FiltroPlanilha {
  const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");
  // "8/2026" → "08/2026": os meses são comparados como texto (YYYY-MM).
  const mesAno = (valor: unknown) => {
    const t = texto(valor);
    const partes = t.match(/^(\d{1,2})\/(\d{4})$/);
    return (partes ? `${partes[1].padStart(2, "0")}/${partes[2]}` : t) || undefined;
  };
  const empresa = texto(entrada.empresa);
  return {
    mesInicio: mesAno(entrada.mesInicio),
    mesFim: mesAno(entrada.mesFim),
    empresa: empresa && empresa !== "todas" ? empresa : undefined,
    incluirPassados: entrada.incluirPassados !== false,
  };
}

interface LinhaOrdenavel {
  linha: LinhaPlanilha;
  numero: number;
}

/**
 * As abas da planilha: por mês de desconto, blocos por empresa (em ordem
 * alfabética), linhas por nome e data da compra. A situação de cada parcela é
 * a mesma de `parcelasDaVenda` — a do popover da fila e do resumo.
 */
export function montarPlanilhaControle(
  vendas: VendaParaPlanilha[],
  filtro: FiltroPlanilha,
  hoje: string
): { abas: AbaPlanilha[]; resumo: ResumoPlanilha } {
  const inicio = filtro.mesInicio ? chaveDoMes(filtro.mesInicio) : null;
  const fim = filtro.mesFim ? chaveDoMes(filtro.mesFim) : null;
  const mesDeHoje = hoje.slice(0, 7);
  const incluirPassados = filtro.incluirPassados ?? true;
  const empresaFiltro = filtro.empresa?.trim().toUpperCase() || null;

  const porMes = new Map<string, Map<string, LinhaOrdenavel[]>>();

  for (const venda of vendas) {
    const empresaDaVenda = (venda.cliente?.empresa ?? "").trim();
    // Sem diferenciar maiúsculas, como o bloco: "Amazon Five" e "AMAZON FIVE" são a mesma empresa.
    if (empresaFiltro && empresaDaVenda.toUpperCase() !== empresaFiltro) continue;

    const info = parcelasDaVenda(
      {
        id: venda.id,
        status: venda.status,
        antecipada: venda.antecipada,
        clienteId: null,
        clienteNome: venda.cliente?.nome ?? null,
        empresa: venda.cliente?.empresa ?? null,
        dataVenda: venda.dataVenda,
        parcelas_detalhes: venda.parcelasVencimento.map((p) => ({
          numeroParcela: p.numeroParcela ?? undefined,
          dataVencimento: p.dataVencimento,
          valorParcela: p.valorParcela,
          antecipada: p.antecipada,
        })),
      },
      hoje
    );

    const nome = (venda.cliente?.nome ?? "").trim() || "SEM NOME";
    const cpf = formatarDocumento(venda.cliente?.cpf || venda.cliente?.cnpj);
    const produto = descreverProduto(venda);
    const empresa = empresaDaVenda.toUpperCase() || SEM_EMPRESA;

    for (const parcela of info.lista) {
      const mes = mesDoDesconto(parcela.vencimento);
      if (inicio && mes < inicio) continue;
      if (fim && mes > fim) continue;
      if (!incluirPassados && mes < mesDeHoje) continue;

      const blocos = porMes.get(mes) ?? new Map<string, LinhaOrdenavel[]>();
      porMes.set(mes, blocos);
      const linhas = blocos.get(empresa) ?? [];
      blocos.set(empresa, linhas);
      linhas.push({
        numero: parcela.numero,
        linha: {
          nome,
          cpf,
          cargo: "",
          dataCompra: info.dataCompra,
          produto,
          valor: parcela.valor,
          parcela: `${parcela.numero}/${info.quantidade}`,
          dataDesconto: ultimoDiaDoMes(mes),
          status: STATUS[parcela.situacao],
        },
      });
    }
  }

  let parcelas = 0;
  let centavosAntecipados = 0;
  const abas: AbaPlanilha[] = [...porMes.keys()].sort().map((mes) => {
    const blocosDoMes = porMes.get(mes)!;
    const blocos: BlocoPlanilha[] = [...blocosDoMes.keys()].sort(comparar).map((empresa) => ({
      titulo: `DESCONTOS EM FOLHA ${empresa} - AF/BFX`,
      linhas: blocosDoMes
        .get(empresa)!
        .sort(
          (a, b) =>
            comparar(a.linha.nome, b.linha.nome) ||
            a.linha.dataCompra.localeCompare(b.linha.dataCompra) ||
            a.numero - b.numero
        )
        .map((x) => x.linha),
    }));
    const antecipados = blocos.flatMap((b) => b.linhas.filter((l) => l.status === "ANTECIPAÇÃO OK").map((l) => l.valor));
    parcelas += blocos.reduce((soma, b) => soma + b.linhas.length, 0);
    centavosAntecipados += antecipados.reduce((soma, v) => soma + Math.round(v * 100), 0);
    return { mes, nome: nomeDaAba(mes), blocos, antecipados };
  });

  return { abas, resumo: { abas: abas.length, parcelas, valorAntecipado: centavosAntecipados / 100 } };
}
