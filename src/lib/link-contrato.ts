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

/**
 * Desconto em folha ainda sem link de assinatura. O token só nascia na criação
 * pela venda rápida; venda antiga ou editada para folha ficava sem o botão.
 */
export function precisaLinkContrato(venda: VendaLinkContrato): boolean {
  if (venda.status === "cancelada" || venda.status === "estornada") return false;
  const status = venda.assinaturaStatus ?? venda.assinatura?.assinaturaStatus ?? null;
  if (status === "assinado") return false;
  if (venda.assinaturaToken) return false;
  return vendaEhFolhaContrato(venda);
}
