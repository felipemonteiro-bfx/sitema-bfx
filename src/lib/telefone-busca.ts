/**
 * Casamento de telefone entre o WhatsApp e o cadastro de clientes.
 *
 * O WhatsApp entrega E.164 sem "+" ("5592981066004"); a coluna `clientes.telefone`
 * guarda o numero local, formatado para leitura ("(92) 98106-6004"). Comparar as
 * duas strings direto nunca casa — por isso a comparacao aqui e' sempre
 * digito contra digito, dos dois lados.
 */

/** Extrai apenas os digitos. Nulo, indefinido ou vazio viram "". */
export function somenteDigitos(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor.split("").filter((c) => c >= "0" && c <= "9").join("");
}

/**
 * Formas locais (sem DDI) sob as quais o numero pode estar cadastrado.
 *
 * Cobre a virada do nono digito: um cadastro antigo pode ter "(92) 8106-6004"
 * enquanto o WhatsApp manda "5592981066004", e vice-versa.
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
