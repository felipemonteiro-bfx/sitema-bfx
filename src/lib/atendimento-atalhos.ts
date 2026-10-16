import { buscarProdutos } from "@/lib/busca-produtos";
import { resolverEscopo } from "@/lib/mcp-agente";
import {
  boletosDoCliente,
  parcelasDoCliente,
  type BoletoDoCliente,
  type ParcelaDoCliente,
} from "@/lib/cliente-financeiro";

/**
 * Consultas dos atalhos do atendimento. Só leitura, sem guarda: quem chama
 * (as server actions) já exigiu admin.
 *
 * O cliente é resolvido UMA vez pelo telefone da conversa (`resolverEscopo`,
 * a mesma regra da IA) e só o `escopo.clienteId` entra nas consultas.
 * Ambíguo ou sem cadastro devolve `cliente: null`, o motivo e listas vazias.
 */

export interface ItemEstoque {
  nome: string;
  categoria: string | null;
  quantidade: number;
  /** `true` = achado por significado, não por casar o nome pedido. */
  aproximado: boolean;
}

const LIMITE_ESTOQUE = 8;

/**
 * Busca híbrida do MCP (`buscarProdutos`). O preço NÃO sai daqui: é
 * descartado na montagem do item, então nem o payload da action o carrega.
 */
export async function estoque(termo: string): Promise<ItemEstoque[]> {
  const achados = await buscarProdutos(termo.trim(), LIMITE_ESTOQUE);
  return achados.map((p) => ({
    nome: p.nome,
    categoria: p.categoria,
    quantidade: p.qtdEstoque ?? 0,
    aproximado: p.via === "significado",
  }));
}

export type ParcelasDoContato =
  | {
      cliente: { nome: string };
      totalEmAberto: number;
      totalVencido: number;
      parcelas: ParcelaDoCliente[];
    }
  | {
      cliente: null;
      motivo: string;
      totalEmAberto: 0;
      totalVencido: 0;
      parcelas: [];
    };

export async function parcelas(telefone: string): Promise<ParcelasDoContato> {
  const r = await resolverEscopo(telefone);
  if (!r.ok) {
    return { cliente: null, motivo: r.paraOCliente, totalEmAberto: 0, totalVencido: 0, parcelas: [] };
  }
  // Em aberto na visão do cliente: é o que o resumo precisa (vencidas e a vencer).
  const dados = await parcelasDoCliente(r.escopo.clienteId, { apenasEmAberto: true });
  return { cliente: { nome: r.escopo.nome }, ...dados };
}

export type BoletosDoContato =
  | { cliente: { nome: string }; boletos: BoletoDoCliente[] }
  | { cliente: null; motivo: string; boletos: [] };

export async function boletos(telefone: string): Promise<BoletosDoContato> {
  const r = await resolverEscopo(telefone);
  if (!r.ok) return { cliente: null, motivo: r.paraOCliente, boletos: [] };
  const dados = await boletosDoCliente(r.escopo.clienteId, {});
  return { cliente: { nome: r.escopo.nome }, boletos: dados.boletos };
}
