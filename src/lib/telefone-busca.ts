/**
 * Casamento de telefone entre o WhatsApp e o cadastro de clientes.
 *
 * O WhatsApp entrega E.164 sem "+" ("5511987654321"); a coluna `clientes.telefone`
 * guarda o numero local, formatado para leitura ("(11) 98765-4321"). Comparar as
 * duas strings direto nunca casa — por isso a comparacao aqui e' sempre
 * digito contra digito, dos dois lados.
 *
 * Os numeros citados nos comentarios e nos testes sao ficticios de proposito:
 * telefone de cliente nao entra em codigo versionado.
 */

/** Extrai apenas os digitos. Nulo, indefinido ou vazio viram "". */
export function somenteDigitos(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor.split("").filter((c) => c >= "0" && c <= "9").join("");
}

/**
 * Formas locais (sem DDI) sob as quais o numero pode estar cadastrado.
 *
 * Cobre a virada do nono digito: um cadastro antigo pode ter "(11) 8765-4321"
 * enquanto o WhatsApp manda "5511987654321", e vice-versa.
 */
export function variantesLocaisDeTelefone(entrada: string): string[] {
  const digitos = somenteDigitos(entrada);
  // Tira o DDI so quando sobra um numero local plausivel (>= 10 digitos).
  const local = digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;
  if (local.length < 10) return [];

  const variantes = [local];
  if (local.length === 11 && local[2] === "9") {
    // com nono digito -> sem
    variantes.push(local.slice(0, 2) + local.slice(3));
  }
  if (local.length === 10) {
    // sem nono digito -> com
    variantes.push(local.slice(0, 2) + "9" + local.slice(2));
  }
  return [...new Set(variantes)];
}

/**
 * So identifica o cliente quando o telefone aponta para UMA pessoa.
 *
 * Ha telefones compartilhados por varios cadastros — funcionarios da mesma
 * empresa conveniada que informaram o contato do RH. Medido em 2026-08-05:
 * 9 clientes em 4 numeros, um deles com 3 pessoas.
 *
 * Escolher um deles arbitrariamente (o velho `LIMIT 1`) faria a IA do
 * pre-atendimento chamar quem escreveu pelo nome de outra pessoa e listar as
 * compras dela — vazamento de historico entre clientes, justamente o que o
 * prompt manda nao fazer. Na duvida, ninguem e' identificado: a conversa segue
 * como visitante, que e' um caminho que o codigo ja trata.
 */
export function clienteIdentificavel(ids: readonly number[]): number | null {
  return ids.length === 1 ? ids[0] : null;
}
