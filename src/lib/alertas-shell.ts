import { prisma } from "@/lib/db";
import { whereParcelasInadimplentes } from "@/lib/venda-utils";
import { whereAssinaturaPendente } from "@/lib/historico-filtros";
import { whereVendasDoUsuario, type UsuarioEscopo } from "@/lib/vendedor-scope";

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
 * Assinaturas pendentes do usuário: critério único `whereAssinaturaPendente` (o mesmo do
 * Histórico e da busca) somado ao escopo `whereVendasDoUsuario` (vendedorId, com perna legada
 * por nome). Os dois entram em `AND` para as chaves `OR`/`NOT`/`status` nunca se sobrescreverem.
 *
 * Diferença para o alerta diário "[Alerta] Assinaturas pendentes" (api/cron/alertas-admin):
 * o cron conta `Assinatura.assinaturaStatus = "pendente"` de venda ativa feita há mais de N dias
 * (ALERTA_ASSINATURA_DIAS, padrão 3). Aqui é o total pendente, sem janela de dias, e a venda
 * sem linha em `assinaturas` (folha que acabou de ganhar token) também conta, como no Histórico.
 */
export function whereAssinaturasPendentesDoUsuario(session: UsuarioEscopo) {
  return { AND: [whereAssinaturaPendente(), whereVendasDoUsuario(session)] };
}

/** Contadores da sidebar do usuário da sessão. */
export async function carregarAlertasShell(session: UsuarioEscopo): Promise<AlertasShell> {
  const ehAdmin = session.role === "admin";
  // Mesmo critério do relatório de inadimplência: vencimento até agora.
  const [assinaturasPendentes, parcelasVencidas] = await Promise.all([
    prisma.venda.count({ where: whereAssinaturasPendentesDoUsuario(session) }),
    ehAdmin
      ? prisma.parcelaVencimento.count({ where: whereParcelasInadimplentes(new Date()) })
      : Promise.resolve(undefined),
  ]);
  return ehAdmin ? { assinaturasPendentes, parcelasVencidas: parcelasVencidas ?? 0 } : { assinaturasPendentes };
}
