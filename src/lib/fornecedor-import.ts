// Modulo PURO: zero imports, zero alias `@/`. E o contrato do qual o plano
// 06-02 depende, e o que permite verificacao local via
// `node --input-type=module` nesta maquina (vitest nao roda aqui).

export type AcaoFornecedor = "criar" | "reativar" | "ignorar" | "erro";

export type FornecedorExistente = {
  id: number;
  nome: string;
  deletedAt: Date | string | null;
};

export type ClassificacaoNome = {
  acao: AcaoFornecedor;
  id: number | null;
  nomeNormalizado: string;
  motivo: string;
};

/**
 * Normaliza o nome de um fornecedor para comparacao/gravacao: converte para
 * string, remove espacos nas pontas, colapsa espacos internos em um unico
 * espaco e converte para caixa alta pt-BR. Nunca lanca excecao — entradas
 * vazias/nulas viram string vazia.
 */
export function normalizarNomeFornecedor(nome: unknown): string {
  const bruto = String(nome ?? "");
  const colapsado = bruto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  return colapsado.toLocaleUpperCase("pt-BR");
}

/**
 * Decide o que fazer ao cadastrar/importar um fornecedor por nome, comparando
 * o nome normalizado contra a lista de fornecedores existentes (tambem
 * normalizados nesta funcao, entao o chamador pode passar o nome cru do
 * banco). Ver <interface_contract> do plano 06-01 para a tabela de casos.
 */
export function classificarNomeFornecedor(
  nome: unknown,
  existentes: FornecedorExistente[]
): ClassificacaoNome {
  const nomeNormalizado = normalizarNomeFornecedor(nome);

  if (!nomeNormalizado) {
    return { acao: "erro", id: null, nomeNormalizado, motivo: "nome_vazio" };
  }

  const encontrado = existentes.find(
    (existente) => normalizarNomeFornecedor(existente.nome) === nomeNormalizado
  );

  if (!encontrado) {
    return { acao: "criar", id: null, nomeNormalizado, motivo: "novo" };
  }

  if (encontrado.deletedAt == null) {
    return { acao: "ignorar", id: encontrado.id, nomeNormalizado, motivo: "ja_existe_ativo" };
  }

  return { acao: "reativar", id: encontrado.id, nomeNormalizado, motivo: "existe_soft_deletado" };
}
