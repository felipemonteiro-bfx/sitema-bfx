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

/** Teto de linhas aceitas por arquivo (T-06-07: DoS via CSV gigante). */
export const LIMITE_LINHAS_IMPORT = 5000;

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
 * Divide uma linha de CSV pelo separador, respeitando celulas entre aspas
 * (a aspas e removida e o separador dentro dela e preservado como texto).
 * Nao usa o metodo de execucao de regex bloqueado pelo hook — so `.split()`
 * caractere a caractere.
 */
function dividirLinhaCsv(linha: string, separador: string): string[] {
  const celulas: string[] = [];
  let atual = "";
  let dentroDeAspas = false;

  for (const caractere of linha.split("")) {
    if (caractere === '"') {
      dentroDeAspas = !dentroDeAspas;
      continue;
    }
    if (caractere === separador && !dentroDeAspas) {
      celulas.push(atual);
      atual = "";
      continue;
    }
    atual += caractere;
  }
  celulas.push(atual);

  return celulas;
}

/**
 * Faz o parse de um CSV de fornecedores (colunas nome;telefone ou nome,
 * telefone, com ou sem cabecalho, com ou sem aspas). Nunca lanca excecao:
 * linha problematica vira erro reportado com o numero da linha, as demais
 * continuam sendo processadas (D-01). Arquivos acima de
 * `LIMITE_LINHAS_IMPORT` sao rejeitados por inteiro antes de qualquer
 * processamento (T-06-07).
 *
 * Regras: remove BOM do inicio, quebra linhas por `\r?\n`, detecta separador
 * olhando a primeira linha nao vazia (`;` se presente, senao `,`), pula
 * cabecalho quando a primeira celula normalizada for "NOME", descarta em
 * silencio linhas em branco ou so com separadores, e mapeia coluna 0 para
 * nome (normalizado) e coluna 1 para telefone (trim, null quando vazio).
 */
export function parseCsvFornecedores(texto: string): ResultadoParse {
  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const brutas = semBom.split(/\r?\n/);

  if (brutas.length > LIMITE_LINHAS_IMPORT) {
    return {
      linhas: [],
      erros: [{ linha: 0, motivo: "limite_excedido", conteudo: "" }],
    };
  }

  const linhas: LinhaCsvFornecedor[] = [];
  const erros: ErroImportacao[] = [];

  const primeiraNaoVazia = brutas.find((linhaBruta) => linhaBruta.trim().length > 0) ?? "";
  const separador = primeiraNaoVazia.includes(";") ? ";" : ",";

  let indiceInicial = 0;
  const primeiraCelula = dividirLinhaCsv(brutas[0] ?? "", separador)[0]
    ?.trim()
    .toLocaleUpperCase("pt-BR");
  if (primeiraCelula === "NOME") {
    indiceInicial = 1;
  }

  for (let i = indiceInicial; i < brutas.length; i++) {
    const bruta = brutas[i];
    const celulasBrutas = dividirLinhaCsv(bruta, separador);
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
 *
 * Dedupe dentro do arquivo: nomes ja decididos como criar/reativar nesta
 * mesma chamada sao lembrados em `nomesVistosNestaImportacao`; uma segunda
 * ocorrencia do mesmo nome normalizado cai em ignorar com
 * `motivo: "duplicado_no_arquivo"`, para nao tentar criar o mesmo fornecedor
 * duas vezes e estourar o `@unique` de nome no commit.
 */
export function planejarImportacaoFornecedores(
  linhas: LinhaCsvFornecedor[],
  existentes: FornecedorExistente[]
): PlanoImportacao {
  const criar: ItemPlano[] = [];
  const reativar: ItemPlano[] = [];
  const ignorar: ItemPlano[] = [];
  const erros: ErroImportacao[] = [];
  const nomesVistosNestaImportacao = new Set<string>();

  for (const linha of linhas) {
    const classificacao = classificarNomeFornecedor(linha.nome, existentes);

    if (classificacao.acao === "erro") {
      erros.push({ linha: linha.linha, motivo: classificacao.motivo, conteudo: linha.nome });
      continue;
    }

    if (nomesVistosNestaImportacao.has(classificacao.nomeNormalizado)) {
      ignorar.push({
        linha: linha.linha,
        nome: classificacao.nomeNormalizado,
        telefone: linha.telefone,
        id: classificacao.id,
        motivo: "duplicado_no_arquivo",
      });
      continue;
    }
    nomesVistosNestaImportacao.add(classificacao.nomeNormalizado);

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
