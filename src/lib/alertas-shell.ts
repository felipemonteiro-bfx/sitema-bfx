import { prisma } from "@/lib/db";
import { FILTRO_VENDA_VALIDA, whereParcelasInadimplentes } from "@/lib/venda-utils";
import { resolveVendedorScope, type VendedorSessionScope } from "@/lib/vendedor-scope";

/**
 * Contadores e alertas da sidebar (redesign Vantage). Só consultas `count`, em paralelo.
 * Estoque fica de fora de propósito (decisão do milestone v1.1: estoque sem alertas).
 */
export type AlertasShell = {
  assinaturasPendentes: number;
  /** Só admin. Vendedor não recebe a chave. */
  parcelasVencidas?: number;
};

/**
 * Venda com contrato aguardando assinatura: token de assinatura gerado, ainda não assinada,
 * fora canceladas e estornadas. Vendedor enxerga só as próprias vendas (`Venda.vendedor`
 * guarda nomeExibicao || username, o mesmo valor que `resolveVendedorScope` devolve).
 *
 * Diferença para o alerta diário "[Alerta] Assinaturas pendentes" (api/cron/alertas-admin):
 * o cron conta `Assinatura.assinaturaStatus = "pendente"` de venda ativa feita há mais de N dias
 * (ALERTA_ASSINATURA_DIAS, padrão 3). Aqui é o total pendente, sem janela de dias, e a venda
 * sem linha em `assinaturas` (folha que acabou de ganhar token) também conta, como no Histórico.
 */
export function whereAssinaturaPendente(session: VendedorSessionScope) {
  const vendedor = session.role === "admin" ? undefined : resolveVendedorScope(undefined, session);
  return {
    ...FILTRO_VENDA_VALIDA,
    assinaturaToken: { not: null },
    NOT: { assinatura: { is: { assinaturaStatus: "assinado" } } },
    ...(vendedor ? { vendedor } : {}),
  };
}

/** Contadores da sidebar do usuário da sessão. */
export async function carregarAlertasShell(session: VendedorSessionScope): Promise<AlertasShell> {
  const ehAdmin = session.role === "admin";
  // Mesmo critério do relatório de inadimplência: vencimento até agora.
  const [assinaturasPendentes, parcelasVencidas] = await Promise.all([
    prisma.venda.count({ where: whereAssinaturaPendente(session) }),
    ehAdmin
      ? prisma.parcelaVencimento.count({ where: whereParcelasInadimplentes(new Date()) })
      : Promise.resolve(undefined),
  ]);
  return ehAdmin ? { assinaturasPendentes, parcelasVencidas: parcelasVencidas ?? 0 } : { assinaturasPendentes };
}
