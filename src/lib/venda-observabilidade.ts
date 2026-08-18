import { logEvent } from "@/lib/logger";

/**
 * Ponto unico de registro das rejeicoes de venda ANTERIORES a transacao.
 *
 * Existe por causa do incidente de 2026-08-14: o cliente relatou "na hora de salvar so da erro e
 * nao salva" e, quatro dias depois, nao havia como dizer o que falhou. O app rodou o dia inteiro,
 * o Postgres so registrou checkpoint, a sonda externa nao viu queda e `vendas_id_seq` nao tinha
 * buraco — ou seja, nenhuma transacao chegou a abrir. A tentativa morreu numa validacao, e toda
 * validacao retornava `errorResponse(...)` sem escrever uma linha sequer.
 *
 * O erro que o usuario ve continua o mesmo; o que muda e existir a contraparte no servidor.
 * Consulta: `kubectl logs deploy/bfx-app | grep '"event":"venda_rejeitada"'`.
 *
 * Ver docs/observabilidade.md.
 */
export type RejeicaoVenda = {
  /** Por onde a venda entrou — separa PDV de importacao em lote na hora de filtrar. */
  origem: "venda-rapida" | "venda-rapida-legada" | "importacao";
  /** A mesma mensagem que o usuario recebeu, para casar o print dele com a linha de log. */
  motivo: string;
  clienteId?: number;
  vendedor?: string;
  /** Quantidade de itens da tentativa (nao o conteudo — nada de dado do cliente no log). */
  itens?: number;
};

/**
 * Emite `{"scope":"venda","event":"venda_rejeitada",...}`.
 *
 * Nunca lanca: esta funcao roda no caminho de uma venda que ja vai ser recusada, e um log
 * quebrado nao pode transformar uma recusa com mensagem clara num erro 500 sem mensagem.
 */
export function registrarRejeicaoVenda(rejeicao: RejeicaoVenda): void {
  try {
    const { origem, motivo, clienteId, vendedor, itens } = rejeicao;

    logEvent("venda", "venda_rejeitada", {
      origem,
      motivo: motivo && motivo.trim() ? motivo : "(sem motivo)",
      // Campo ausente e omitido de proposito: `undefined` sumiria do JSON de qualquer jeito,
      // mas deixar a chave fora mantem a linha curta e o filtro por chave confiavel.
      ...(clienteId !== undefined && { clienteId }),
      ...(vendedor !== undefined && { vendedor }),
      ...(itens !== undefined && { itens }),
    });
  } catch {
    // Sem fallback ruidoso: se ate o log falhou, o proximo passo do chamador ainda e devolver a
    // mensagem de rejeicao ao usuario.
  }
}
