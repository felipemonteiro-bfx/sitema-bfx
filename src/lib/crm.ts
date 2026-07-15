/**
 * CRM — estágios do funil e segmentação de clientes.
 *
 * Princípio: o CRM não é um silo. Um "lead" é um `Cliente` que ainda não comprou
 * (importado da lista de funcionários da empresa parceira). Ao registrar a 1ª venda,
 * o estágio vira "cliente". Segmentos são filtros sobre o mesmo `Cliente`.
 *
 * `buildClienteSegmentWhere` é pura e testável (sem DB): devolve um objeto de filtro
 * no formato `Prisma.ClienteWhereInput` para ser passado ao `prisma.cliente.findMany`.
 */

export const ESTAGIOS_CRM = {
  NOVO_LEAD: "novo_lead",
  CONTATADO: "contatado",
  NEGOCIANDO: "negociando",
  CLIENTE: "cliente",
  INATIVO: "inativo",
} as const;

export type EstagioCrm = (typeof ESTAGIOS_CRM)[keyof typeof ESTAGIOS_CRM];

export const ESTAGIOS_ORDEM: EstagioCrm[] = [
  ESTAGIOS_CRM.NOVO_LEAD,
  ESTAGIOS_CRM.CONTATADO,
  ESTAGIOS_CRM.NEGOCIANDO,
  ESTAGIOS_CRM.CLIENTE,
  ESTAGIOS_CRM.INATIVO,
];

export function estagioLabel(estagio: string | null | undefined): string {
  switch (estagio) {
    case ESTAGIOS_CRM.NOVO_LEAD:
      return "Novo lead";
    case ESTAGIOS_CRM.CONTATADO:
      return "Contatado";
    case ESTAGIOS_CRM.NEGOCIANDO:
      return "Negociando";
    case ESTAGIOS_CRM.CLIENTE:
      return "Cliente";
    case ESTAGIOS_CRM.INATIVO:
      return "Inativo";
    default:
      return "—";
  }
}

/** Um lead é qualquer estágio anterior a "cliente". */
export function isLead(estagio: string | null | undefined): boolean {
  return (
    estagio === ESTAGIOS_CRM.NOVO_LEAD ||
    estagio === ESTAGIOS_CRM.CONTATADO ||
    estagio === ESTAGIOS_CRM.NEGOCIANDO
  );
}

export type SegmentoFiltro = {
  /** Estágios do funil a incluir. */
  estagios?: EstagioCrm[];
  /** IDs de tags — cliente precisa ter TODAS (AND) por padrão. */
  tagIds?: number[];
  /** Empresa parceira. */
  empresaParceiraId?: number;
  /** Sem compra há N dias (inatividade) — considera a venda mais recente. */
  inativoDias?: number;
  /** true = só quem já comprou; false = só quem nunca comprou (leads puros). */
  comprou?: boolean;
  /** Faixa de pontos (nível de fidelidade) — { gte?, lt? }. */
  pontosRange?: { gte?: number; lt?: number };
  /** Busca textual por nome. */
  busca?: string;
  /** Data de referência para o cálculo de inatividade (default: agora, injetável em teste). */
  agora?: Date;
};

// Tipo estrutural mínimo do where (evita depender do Prisma Client gerado nos testes).
export type ClienteSegmentWhere = {
  estagioCrm?: { in: string[] };
  empresaParceiraId?: number;
  nome?: { contains: string; mode: "insensitive" };
  pontos?: { gte?: number; lt?: number };
  AND?: unknown[];
  vendas?: unknown;
};

/**
 * Monta o filtro Prisma para um segmento de clientes.
 * Compatível com `prisma.cliente.findMany({ where })`.
 */
export function buildClienteSegmentWhere(filtro: SegmentoFiltro): ClienteSegmentWhere {
  const where: ClienteSegmentWhere = {};
  const and: unknown[] = [];

  if (filtro.estagios && filtro.estagios.length > 0) {
    where.estagioCrm = { in: filtro.estagios };
  }

  if (filtro.empresaParceiraId) {
    where.empresaParceiraId = filtro.empresaParceiraId;
  }

  if (filtro.busca && filtro.busca.trim()) {
    where.nome = { contains: filtro.busca.trim(), mode: "insensitive" };
  }

  if (filtro.pontosRange && (filtro.pontosRange.gte !== undefined || filtro.pontosRange.lt !== undefined)) {
    where.pontos = filtro.pontosRange;
  }

  // Tags: exige TODAS as tags (AND de "some").
  if (filtro.tagIds && filtro.tagIds.length > 0) {
    for (const tagId of filtro.tagIds) {
      and.push({ tags: { some: { tagId } } });
    }
  }

  // Comprou / nunca comprou.
  if (filtro.comprou === true) {
    and.push({ vendas: { some: {} } });
  } else if (filtro.comprou === false) {
    and.push({ vendas: { none: {} } });
  }

  // Inatividade: nenhuma venda depois do corte (mas tem histórico).
  if (filtro.inativoDias && filtro.inativoDias > 0) {
    const base = filtro.agora ?? new Date();
    const corte = new Date(base);
    corte.setDate(corte.getDate() - filtro.inativoDias);
    and.push({ vendas: { some: {} } });
    and.push({ vendas: { none: { dataVenda: { gte: corte } } } });
  }

  if (and.length > 0) where.AND = and;
  return where;
}
