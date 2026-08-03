// Modulo PURO: zero imports, zero alias `@/`. Permite verificacao local via
// `node --input-type=module` nesta maquina (vitest nao roda aqui).
//
// DAT-03 / D-06 (plano 06-03): monta os botoes de "Exportacao Rapida" de
// /relatorios a partir das empresas parceiras do banco, sem nenhuma lista de
// nomes fixa no codigo. Preserva a regra ja existente antes deste plano: uma
// empresa cujo nome coincida com o de um fornecedor nao vira botao.

export type NomeadoParaOpcao = { nome: string };

/**
 * Monta a lista de nomes de empresa parceira elegiveis para os botoes de
 * Exportacao Rapida. Devolve os nomes na ordem recebida em `empresas`,
 * excluindo:
 * - nomes que coincidam (ignorando caixa e espacos nas pontas) com o nome de
 *   algum fornecedor (regra de D-06);
 * - duplicatas, ignorando caixa, mantendo a primeira ocorrencia;
 * - nomes vazios ou compostos so por espaco.
 *
 * Nunca injeta nenhum nome que nao tenha vindo do parametro `empresas`.
 */
export function montarEmpresaOptions(
  empresas: NomeadoParaOpcao[],
  fornecedores: NomeadoParaOpcao[]
): string[] {
  const nomesFornecedores = new Set(
    fornecedores.map((fornecedor) => String(fornecedor?.nome ?? "").trim().toLowerCase())
  );

  const vistos = new Set<string>();
  const resultado: string[] = [];

  for (const empresa of empresas) {
    const nome = String(empresa?.nome ?? "").trim();
    if (!nome) continue;

    const chave = nome.toLowerCase();
    if (nomesFornecedores.has(chave)) continue;
    if (vistos.has(chave)) continue;

    vistos.add(chave);
    resultado.push(nome);
  }

  return resultado;
}
