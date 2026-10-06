import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";

export type VendaLinkContrato = {
  id: number;
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
  assinaturaToken?: string | null;
  status?: string | null;
  assinaturaStatus?: string | null;
  assinatura?: { assinaturaStatus: string | null } | null;
};

/** Folha pela forma canônica. Sem forma gravada, vale o flag legado. */
export function vendaEhFolhaContrato(venda: {
  formaPagamento?: string | null;
  descontoEmFolha?: boolean | null;
}): boolean {
  if (venda.formaPagamento != null && venda.formaPagamento !== "") {
    return venda.formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA;
  }
  return Boolean(venda.descontoEmFolha);
}

function vendaEncerrada(venda: { status?: string | null }): boolean {
  return venda.status === "cancelada" || venda.status === "estornada";
}

function statusAssinatura(venda: Omit<VendaLinkContrato, "id">): string | null {
  return venda.assinaturaStatus ?? venda.assinatura?.assinaturaStatus ?? null;
}

/**
 * Desconto em folha ainda sem link de assinatura. O token só nascia na criação
 * pela venda rápida; venda antiga ou editada para folha ficava sem o botão.
 */
export function precisaLinkContrato(venda: VendaLinkContrato): boolean {
  if (vendaEncerrada(venda)) return false;
  if (statusAssinatura(venda) === "assinado") return false;
  if (venda.assinaturaToken) return false;
  return vendaEhFolhaContrato(venda);
}

/** Token já gravado, mas a linha pendente de assinatura não. */
export function faltaAssinaturaPendente(venda: Omit<VendaLinkContrato, "id">): boolean {
  if (!venda.assinaturaToken) return false;
  if (vendaEncerrada(venda)) return false;
  if (statusAssinatura(venda) === "assinado") return false;
  if (venda.assinatura) return false;
  return vendaEhFolhaContrato(venda);
}

/**
 * O UPDATE repete a elegibilidade. Entre a leitura da página e a gravação
 * a venda pode ter saído de folha, sido cancelada ou assinada.
 */
export function whereNovoLinkContrato(vendaId: number) {
  return {
    id: vendaId,
    assinaturaToken: null,
    status: { notIn: ["cancelada", "estornada"] },
    NOT: { assinatura: { is: { assinaturaStatus: "assinado" } } },
    OR: [
      { formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA },
      { descontoEmFolha: true, OR: [{ formaPagamento: null }, { formaPagamento: "" }] },
    ],
  };
}
