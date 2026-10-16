/**
 * Filtros do Histórico de vendas no servidor: fragmento Prisma do filtro de
 * assinatura, URL para remover um chip e lista de filtros ativos.
 *
 * Parâmetros reais de /historico: from, to, vendedor, cliente, produto,
 * formaPagamento, q, assinatura (e page/edit, que não são filtros).
 */
import type { Prisma } from "@/generated/prisma";
import { formaPagamentoLabel, isFormaPagamento } from "@/lib/forma-pagamento";
import { FILTRO_VENDA_VALIDA } from "@/lib/venda-utils";
import { paraInputDate } from "@/lib/periodo-data";
import { resolveVendedorScope, type VendedorSessionScope } from "@/lib/vendedor-scope";

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
 * FONTE ÚNICA do critério de "assinatura pendente" (Histórico, sidebar e busca ⌘K).
 *
 * Venda válida (FILTRO_VENDA_VALIDA: fora canceladas e estornadas), com link de assinatura
 * gerado (`assinaturaToken`) e SEM `Assinatura` concluída. Venda sem linha em `assinaturas`
 * (a linha só nasce no primeiro acesso ao link) conta como pendente, igual ao indicador da
 * linha do Histórico. Assinaturas `expirado` e `processando` também contam como pendentes:
 * só `assinado` tira a venda da lista.
 *
 * O cron de alertas (api/cron/alertas-admin) e a tool da IA usam `assinaturaStatus: "pendente"`
 * de venda ativa, critério mais estreito de propósito (aviso diário após N dias).
 */
export function whereAssinaturaPendente(): Prisma.VendaWhereInput {
  return {
    ...FILTRO_VENDA_VALIDA,
    assinaturaToken: { not: null },
    NOT: { assinatura: { is: { assinaturaStatus: "assinado" } } },
  };
}

export function whereAssinatura(valor: string | undefined): Prisma.VendaWhereInput | undefined {
  if (valor === "pendente") return whereAssinaturaPendente();
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

/** Início do "todo o período" no Histórico (o contador de pendentes não tem janela de datas). */
export const INICIO_TODO_PERIODO = "2000-01-01";

/**
 * Destino ÚNICO do contador de assinaturas pendentes (bloco de alertas, item Histórico da
 * sidebar e ação do ⌘K). O Histórico sem datas cai no mês corrente, mas o contador
 * (`carregarAlertasShell`) conta todo o período; por isso a URL leva `from` bem antigo e `to` = hoje
 * (UTC, como o resto do Histórico). Não-admin leva o próprio nome, o mesmo texto que o Histórico
 * filtra. O escopo do Histórico por vendedor é outro card (decisão 7).
 */
export function urlPendentesDoUsuario(session: VendedorSessionScope, hoje: Date = new Date()): string {
  const params = new URLSearchParams({ assinatura: "pendente", from: INICIO_TODO_PERIODO, to: paraInputDate(hoje) });
  const vendedor = session.role === "admin" ? undefined : resolveVendedorScope(undefined, session);
  if (vendedor) params.set("vendedor", vendedor);
  return `/historico?${params.toString()}`;
}
