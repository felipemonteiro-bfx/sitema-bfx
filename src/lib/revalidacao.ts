/**
 * Grupos de rotas a revalidar por entidade.
 *
 * O problema que isto resolve: cada server action revalidava só a própria tela, mas
 * o mesmo dado aparece em várias. Uma venda entra no dashboard, no DRE do
 * financeiro, no histórico, na fila da Prudent, nos relatórios, nas comissões e nos
 * boletos — e só o histórico atualizava. O resultado para quem usa era "salvei e o
 * número não mudou até dar reload".
 *
 * Manter a lista de telas afetadas aqui, e não espalhada em cada action, é o que
 * evita a próxima tela nova nascer desatualizada.
 */

import { revalidatePath } from "next/cache";

/**
 * Telas afetadas por uma venda.
 *
 * Inclui /cadastros e /crm/fidelidade porque a venda nao grava so a venda: ela
 * debita estoque e mexe no saldo de pontos do cliente. Sem essas duas, o estoque
 * na aba de produtos e o saldo no CRM continuavam velhos depois de vender.
 */
export const ROTAS_VENDA = [
  "/dashboard",
  "/historico",
  "/financeiro",
  "/relatorios",
  "/comissoes",
  "/boletos",
  "/prudent",
  "/venda-rapida",
  "/cadastros",
  "/crm",
  "/crm/fidelidade",
] as const;

/** Telas que listam clientes. */
export const ROTAS_CLIENTE = [
  "/cadastros",
  "/crm",
  "/crm/fidelidade",
  "/venda-rapida",
] as const;

/** Telas que listam produtos ou dependem do estoque. */
export const ROTAS_PRODUTO = [
  "/cadastros",
  "/venda-rapida",
  "/financeiro",
] as const;

/** Telas afetadas por despesa (o DRE e os relatórios somam despesas). */
export const ROTAS_DESPESA = [
  "/financeiro",
  "/dashboard",
  "/relatorios",
] as const;

/** Telas que listam usuários — vendedores aparecem em comissões e na venda. */
export const ROTAS_USUARIO = [
  "/gestao-rh",
  "/comissoes",
  "/venda-rapida",
  "/dashboard",
] as const;

/** Telas que listam fornecedores. */
export const ROTAS_FORNECEDOR = [
  "/cadastros",
  "/relatorios",
] as const;

/** Telas que dependem de empresa parceira ou dos vínculos entre elas. */
export const ROTAS_EMPRESA = [
  "/cadastros",
  "/relatorios",
  "/relatorios/mensais",
  "/crm",
  "/importacao/clientes",
  "/prudent",
] as const;

/** Config global: logo, avisos e credenciais aparecem em várias telas. */
export const ROTAS_CONFIG = [
  "/configuracoes",
  "/dashboard",
  "/boletos",
] as const;

/** Telas de CRM afetadas por pontos de fidelidade e campanhas. */
export const ROTAS_CRM = [
  "/crm",
  "/crm/fidelidade",
  "/crm/campanhas",
] as const;

function revalidarRotas(rotas: readonly string[]) {
  for (const rota of rotas) {
    try {
      revalidatePath(rota);
    } catch (erro) {
      // `revalidatePath` exige contexto de request do Next. Parte destas escritas
      // tambem roda por caminhos sem esse contexto (MCP, cron, script), e ali a
      // chamada lanca. Revalidar e best-effort: nunca pode derrubar uma gravacao
      // que ja foi concluida no banco.
      //
      // Mas engolir calado faria a regressao voltar sem sinal nenhum: se um upgrade
      // do Next quebrar isto, todas as telas param de atualizar e nada avisa.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[revalidacao] falhou para", rota, erro);
      }
    }
  }
}

export const revalidarVenda = () => revalidarRotas(ROTAS_VENDA);
export const revalidarCliente = () => revalidarRotas(ROTAS_CLIENTE);
export const revalidarProduto = () => revalidarRotas(ROTAS_PRODUTO);
export const revalidarDespesa = () => revalidarRotas(ROTAS_DESPESA);
export const revalidarUsuario = () => revalidarRotas(ROTAS_USUARIO);
export const revalidarFornecedor = () => revalidarRotas(ROTAS_FORNECEDOR);
export const revalidarEmpresa = () => revalidarRotas(ROTAS_EMPRESA);
export const revalidarConfig = () => revalidarRotas(ROTAS_CONFIG);
export const revalidarCrm = () => revalidarRotas(ROTAS_CRM);
