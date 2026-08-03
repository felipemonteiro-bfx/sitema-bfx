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

export type LinhaCsvFornecedor = {
  linha: number;
  nome: string;
  telefone: string | null;
};

export type ErroImportacao = {
  linha: number;
  motivo: string;
  conteudo: string;
};

export type ResultadoParse = {
  linhas: LinhaCsvFornecedor[];
  erros: ErroImportacao[];
};

/**
 * Faz o parse de um CSV de fornecedores (colunas nome;telefone, com ou sem
 * cabecalho). Nunca lanca excecao: linha problematica vira erro reportado com
 * o numero da linha, as demais continuam sendo processadas (D-01).
 *
 * Caminho feliz desta task (06-02 Task 1): remove BOM, quebra linhas por
 * `\r?\n`, detecta separador olhando a primeira linha nao vazia, pula
 * cabecalho quando a primeira celula normalizada for "NOME", mapeia coluna 0
 * para nome (normalizado) e coluna 1 para telefone (trim, null quando vazio).
 * A robustez adicional (aspas, dedupe, limite de linhas) e endurecida na
 * Task 3, sem mudar este contrato.
 */
export function parseCsvFornecedores(texto: string): ResultadoParse {
  const linhas: LinhaCsvFornecedor[] = [];
  const erros: ErroImportacao[] = [];

  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const brutas = semBom.split(/\r?\n/);

  const primeiraNaoVazia = brutas.find((linhaBruta) => linhaBruta.trim().length > 0) ?? "";
  const separador = primeiraNaoVazia.includes(";") ? ";" : ",";

  let indiceInicial = 0;
  const primeiraCelula = (brutas[0] ?? "")
    .split(separador)[0]
    ?.trim()
    .toLocaleUpperCase("pt-BR");
  if (primeiraCelula === "NOME") {
    indiceInicial = 1;
  }

  for (let i = indiceInicial; i < brutas.length; i++) {
    const bruta = brutas[i];
    const celulasBrutas = bruta.split(separador);
    const linhaEmBranco = celulasBrutas.every((celula) => celula.trim().length === 0);
    if (linhaEmBranco) continue;

    const numeroLinha = i + 1;
    const nomeNormalizado = normalizarNomeFornecedor(celulasBrutas[0]);
    const telefoneCru = (celulasBrutas[1] ?? "").trim();
    const telefone = telefoneCru.length > 0 ? telefoneCru : null;

    if (!nomeNormalizado) {
      erros.push({ linha: numeroLinha, motivo: "nome_vazio", conteudo: bruta });
      continue;
    }

    linhas.push({ linha: numeroLinha, nome: nomeNormalizado, telefone });
  }

  return { linhas, erros };
}

export type ItemPlano = {
  linha: number;
  nome: string;
  telefone: string | null;
  id: number | null;
  motivo: string;
};

export type PlanoImportacao = {
  criar: ItemPlano[];
  reativar: ItemPlano[];
  ignorar: ItemPlano[];
  erros: ErroImportacao[];
  resumo: { total: number; criar: number; reativar: number; ignorar: number; erros: number };
};

/**
 * Monta o plano de importacao: para cada linha ja parseada, delega a decisao
 * a classificarNomeFornecedor (mesma regra usada em addFornecedor, plano
 * 06-01) e distribui em criar/reativar/ignorar/erros. resumo.total sempre
 * soma os 4 baldes, para a tela nunca esconder uma linha do usuario.
 */
export function planejarImportacaoFornecedores(
  linhas: LinhaCsvFornecedor[],
  existentes: FornecedorExistente[]
): PlanoImportacao {
  const criar: ItemPlano[] = [];
  const reativar: ItemPlano[] = [];
  const ignorar: ItemPlano[] = [];
  const erros: ErroImportacao[] = [];

  for (const linha of linhas) {
    const classificacao = classificarNomeFornecedor(linha.nome, existentes);

    if (classificacao.acao === "erro") {
      erros.push({ linha: linha.linha, motivo: classificacao.motivo, conteudo: linha.nome });
      continue;
    }

    const item: ItemPlano = {
      linha: linha.linha,
      nome: classificacao.nomeNormalizado,
      telefone: linha.telefone,
      id: classificacao.id,
      motivo: classificacao.motivo,
    };

    if (classificacao.acao === "criar") criar.push(item);
    else if (classificacao.acao === "reativar") reativar.push(item);
    else ignorar.push(item);
  }

  return {
    criar,
    reativar,
    ignorar,
    erros,
    resumo: {
      total: criar.length + reativar.length + ignorar.length + erros.length,
      criar: criar.length,
      reativar: reativar.length,
      ignorar: ignorar.length,
      erros: erros.length,
    },
  };
}
