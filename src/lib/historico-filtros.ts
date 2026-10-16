/**
 * Filtros do Histórico de vendas no servidor: fragmento Prisma do filtro de
 * assinatura, URL para remover um chip e lista de filtros ativos.
 *
 * Parâmetros reais de /historico: from, to, vendedor, cliente, produto,
 * formaPagamento, q, assinatura (e page/edit, que não são filtros).
 */
import type { Prisma } from "@prisma/client";
import { formaPagamentoLabel, isFormaPagamento } from "@/lib/forma-pagamento";

export type FiltrosHistorico = {
  from?: string;
  to?: string;
  vendedor?: string;
  cliente?: string;
  produto?: string;
  formaPagamento?: string;
  q?: string;
  assinatura?: string;
  page?: string;
  edit?: string;
};

export type FiltroAtivo = { chave: string; rotulo: string; valor: string };

const ASSINATURA_ROTULO: Record<string, string> = { pendente: "Pendente", assinado: "Assinado" };

/**
 * Critério de "assinatura pendente" igual ao do Histórico (page.tsx, indicador
 * da linha: `assinatura.assinaturaStatus === 'assinado'` = assinada; senão, com
 * `assinaturaToken` = "Aguardando assinatura") e ao da sidebar (spec B2: token,
 * não assinada, não cancelada/estornada). O cron de alertas
 * (api/cron/alertas-admin/route.ts:58-64) e a tool da IA (ai-actions.ts:1411-1417)
 * usam `assinaturaStatus: "pendente"`, mas a linha da assinatura só existe depois
 * do primeiro acesso ao link; por isso aqui o token é o sinal confiável.
 */
export function whereAssinatura(valor: string | undefined): Prisma.VendaWhereInput | undefined {
  if (valor === "pendente") {
    return {
      assinaturaToken: { not: null },
      status: "ativa",
      NOT: { assinatura: { assinaturaStatus: "assinado" } },
    };
  }
  if (valor === "assinado") {
    return { assinatura: { assinaturaStatus: "assinado" } };
  }
  return undefined;
}

/** Chaves que um chip remove de uma vez (o período leva from e to juntos). */
const GRUPOS: Record<string, string[]> = { periodo: ["from", "to"] };

/** URL do Histórico sem o filtro `chave` e sem `page` (volta para a página 1). */
export function urlSemFiltro(searchParams: Record<string, string | undefined>, chave: string): string {
  const remover = new Set([...(GRUPOS[chave] ?? [chave]), "page"]);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (remover.has(k) || !v) continue;
    params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/historico?${qs}` : "/historico";
}

function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

function preenchido(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && t !== "all" ? t : undefined;
}

/**
 * Filtros ativos para os chips removíveis. `nomes` resolve ids em nomes
 * (ex.: cliente "7" -> "Maria"); sem resolução, mostra o valor cru.
 */
export function filtrosAtivos(
  sp: FiltrosHistorico,
  nomes: { cliente?: Record<string, string> } = {},
): FiltroAtivo[] {
  const lista: FiltroAtivo[] = [];

  const q = preenchido(sp.q);
  if (q) lista.push({ chave: "q", rotulo: "Busca", valor: q });

  const from = preenchido(sp.from);
  const to = preenchido(sp.to);
  if (from || to) {
    const valor = from && to ? `${dataBR(from)} a ${dataBR(to)}` : from ? `a partir de ${dataBR(from)}` : `até ${dataBR(to!)}`;
    lista.push({ chave: "periodo", rotulo: "Período", valor });
  }

  const vendedor = preenchido(sp.vendedor);
  if (vendedor) lista.push({ chave: "vendedor", rotulo: "Vendedor", valor: vendedor });

  const cliente = preenchido(sp.cliente);
  if (cliente) lista.push({ chave: "cliente", rotulo: "Cliente", valor: nomes.cliente?.[cliente] ?? cliente });

  const produto = preenchido(sp.produto);
  if (produto) lista.push({ chave: "produto", rotulo: "Produto", valor: produto });

  const forma = preenchido(sp.formaPagamento);
  if (forma) {
    lista.push({ chave: "formaPagamento", rotulo: "Forma", valor: isFormaPagamento(forma) ? formaPagamentoLabel(forma) : forma });
  }

  const assinatura = preenchido(sp.assinatura);
  if (assinatura && ASSINATURA_ROTULO[assinatura]) {
    lista.push({ chave: "assinatura", rotulo: "Assinatura", valor: ASSINATURA_ROTULO[assinatura] });
  }

  return lista;
}
