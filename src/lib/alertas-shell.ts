import { unstable_cache } from "next/cache";
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

/** Quanto tempo os contadores da sidebar podem ficar velhos (o layout é force-dynamic). */
export const REVALIDAR_ALERTAS_SEGUNDOS = 60;

/**
 * Contadores da sidebar do usuário da sessão, em cache de 60s POR USUÁRIO: o layout roda a cada
 * navegação e eram 2 `count` em cada uma. A chave leva id, perfil e nome (a perna legada do
 * escopo filtra por nome), então um usuário nunca recebe o número de outro. Falhas propagam: o
 * layout trata com try/catch e a sidebar fica sem números.
 */
export async function carregarAlertasShell(session: UsuarioEscopo): Promise<AlertasShell> {
  const cacheado = unstable_cache(
    () => consultarAlertasShell(session),
    ["alertas-shell", String(session.id), session.role, session.nomeExibicao || session.username],
    { revalidate: REVALIDAR_ALERTAS_SEGUNDOS },
  );
  return cacheado();
}

async function consultarAlertasShell(session: UsuarioEscopo): Promise<AlertasShell> {
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
