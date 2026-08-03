// Modulo PURO: zero imports, zero alias `@/`. E o contrato do qual o plano
// 09-02 depende, e o que permite verificacao local via
// `node --input-type=module` nesta maquina (vitest nao roda aqui).

/** Teto de linhas aceitas por arquivo (T-09-09: DoS via CSV gigante). */
export const LIMITE_LINHAS_IMPORT_CLIENTES = 5000;

export type LinhaCsvCliente = {
  linha: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  matricula: string | null;
  email: string | null;
};

export type ErroImportacaoCliente = { linha: number; motivo: string; conteudo: string };
export type ResultadoParseClientes = { linhas: LinhaCsvCliente[]; erros: ErroImportacaoCliente[] };

export type ChaveCliente = { tipo: "cpf" | "nome"; valor: string };

/**
 * Normaliza o nome do cliente para comparacao/gravacao: converte para string,
 * remove espacos nas pontas, colapsa espacos internos em um unico espaco e
 * converte para caixa alta pt-BR. Mesma semantica de `normalizarNomeCliente`
 * (src/lib/cliente-rapido.ts) e `normalizarNomeFornecedor`
 * (src/lib/fornecedor-import.ts); duplicada de proposito para os tres modulos
 * continuarem puros. Nunca lanca excecao — entradas vazias/nulas viram string
 * vazia.
 */
export function normalizarNomeClienteImport(nome: unknown): string {
  const bruto = String(nome ?? "");
  const colapsado = bruto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  return colapsado.toLocaleUpperCase("pt-BR");
}

/** So os digitos da celula de CPF; `null` quando a celula vem vazia. */
export function normalizarCpf(cpf: unknown): string | null {
  const digitos = String(cpf ?? "")
    .split("")
    .filter((c) => c >= "0" && c <= "9")
    .join("");
  return digitos.length > 0 ? digitos : null;
}

/**
 * Chave de idempotencia do importador (D-04): CPF quando ha CPF, nome
 * normalizado quando nao ha. `Cliente.nome` e `@unique` no schema e `cpf` e
 * opcional, entao usar so o nome duplicaria homonimos e usar so o CPF
 * deixaria de fora quem nao tem CPF.
 */
export function chaveDoCliente(linha: { nome: string; cpf: string | null }): ChaveCliente {
  if (linha.cpf) {
    return { tipo: "cpf", valor: linha.cpf };
  }
  return { tipo: "nome", valor: normalizarNomeClienteImport(linha.nome) };
}

/**
 * Divide uma linha de CSV pelo separador, respeitando celulas entre aspas
 * (a aspas e removida e o separador dentro dela e preservado como texto).
 * Nao usa o metodo de execucao de regex bloqueado pelo hook — so `.split()`
 * caractere a caractere. Copiado da forma ja aprovada em
 * `fornecedor-import.ts:93-113`.
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

/** Campo de texto opcional: trim, vira `null` quando fica em branco. */
function normalizarCampoOpcional(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

/**
 * Faz o parse de um CSV de clientes (colunas nome;cpf;telefone;matricula;
 * email, com ou sem cabecalho, com ou sem aspas). Nunca lanca excecao: linha
 * problematica vira erro reportado com o numero da linha, as demais
 * continuam sendo processadas. Arquivos acima de
 * `LIMITE_LINHAS_IMPORT_CLIENTES` sao rejeitados por inteiro antes de
 * qualquer processamento (T-09-09).
 *
 * Regras: remove BOM do inicio, quebra linhas por `\r?\n`, detecta separador
 * olhando a primeira linha nao vazia (`;` se presente, senao `,`), pula
 * cabecalho quando a primeira celula normalizada for "NOME", descarta em
 * silencio linhas em branco ou so com separadores, e mapeia as colunas na
 * ordem nome, cpf, telefone, matricula, email.
 */
export function parseCsvClientes(texto: string): ResultadoParseClientes {
  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const brutas = semBom.split(/\r?\n/);

  if (brutas.length > LIMITE_LINHAS_IMPORT_CLIENTES) {
    return {
      linhas: [],
      erros: [{ linha: 0, motivo: "limite_excedido", conteudo: "" }],
    };
  }

  const linhas: LinhaCsvCliente[] = [];
  const erros: ErroImportacaoCliente[] = [];

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
    const nomeNormalizado = normalizarNomeClienteImport(celulasBrutas[0]);

    if (!nomeNormalizado) {
      erros.push({ linha: numeroLinha, motivo: "nome_vazio", conteudo: bruta });
      continue;
    }

    const cpfCelula = (celulasBrutas[1] ?? "").trim();
    const cpf = normalizarCpf(cpfCelula);
    if (cpfCelula.length > 0 && cpf !== null && cpf.length !== 11) {
      erros.push({ linha: numeroLinha, motivo: "cpf_invalido", conteudo: bruta });
      continue;
    }

    linhas.push({
      linha: numeroLinha,
      nome: nomeNormalizado,
      cpf,
      telefone: normalizarCampoOpcional(celulasBrutas[2]),
      matricula: normalizarCampoOpcional(celulasBrutas[3]),
      email: normalizarCampoOpcional(celulasBrutas[4]),
    });
  }

  return { linhas, erros };
}

export type ClienteExistente = {
  id: number;
  nome: string;
  cpf: string | null;
  empresaParceiraId: number | null;
};

export type ItemPlanoCliente = LinhaCsvCliente & { id: number | null; motivo: string };

export type PlanoImportacaoClientes = {
  criar: ItemPlanoCliente[];
  vincular: ItemPlanoCliente[];
  ignorar: ItemPlanoCliente[];
  erros: ErroImportacaoCliente[];
  resumo: { total: number; criar: number; vincular: number; ignorar: number; erros: number };
};

/**
 * Monta o plano de importacao de clientes. Para cada linha ja parseada,
 * decide na ordem (a ordem importa — ver `<action>` do plano 09-02):
 *
 * 1. chave da linha ja vista nesta chamada -> ignorar, motivo
 *    duplicado_no_arquivo (dedupe dentro do proprio arquivo);
 * 2. existente encontrado pela chave -> ja_vinculado / sem_empresa /
 *    vinculado_a_outra_empresa (D-05: a importacao nunca move um cliente de
 *    uma empresa parceira para outra);
 * 3. nao encontrado, mas o nome normalizado ja esta reservado (por um
 *    registro do banco ou por uma linha anterior desta mesma chamada) ->
 *    ignorar, motivo nome_ja_usado_por_outro_cpf. Esta e a regra que garante
 *    que o commit nunca esbarre no `@unique` de `Cliente.nome`;
 * 4. caso contrario -> criar.
 *
 * resumo.total sempre soma os 4 baldes, para a tela nunca esconder uma linha
 * do usuario.
 */
export function planejarImportacaoClientes(
  linhas: LinhaCsvCliente[],
  existentes: ClienteExistente[],
  empresaParceiraId: number
): PlanoImportacaoClientes {
  const criar: ItemPlanoCliente[] = [];
  const vincular: ItemPlanoCliente[] = [];
  const ignorar: ItemPlanoCliente[] = [];
  const erros: ErroImportacaoCliente[] = [];

  const chavesVistasNestaImportacao = new Set<string>();
  const nomesReservados = new Set<string>(
    existentes.map((existente) => normalizarNomeClienteImport(existente.nome))
  );

  for (const linha of linhas) {
    const chave = chaveDoCliente(linha);
    const chaveTexto = `${chave.tipo}:${chave.valor}`;

    if (chavesVistasNestaImportacao.has(chaveTexto)) {
      ignorar.push({ ...linha, id: null, motivo: "duplicado_no_arquivo" });
      continue;
    }
    chavesVistasNestaImportacao.add(chaveTexto);

    const existente = existentes.find((candidato) => {
      const chaveCandidato =
        chave.tipo === "cpf"
          ? candidato.cpf
          : normalizarNomeClienteImport(candidato.nome);
      return chaveCandidato === chave.valor;
    });

    if (existente) {
      if (existente.empresaParceiraId === empresaParceiraId) {
        ignorar.push({ ...linha, id: existente.id, motivo: "ja_vinculado" });
      } else if (existente.empresaParceiraId == null) {
        vincular.push({ ...linha, id: existente.id, motivo: "sem_empresa" });
      } else {
        ignorar.push({ ...linha, id: existente.id, motivo: "vinculado_a_outra_empresa" });
      }
      continue;
    }

    if (nomesReservados.has(linha.nome)) {
      ignorar.push({ ...linha, id: null, motivo: "nome_ja_usado_por_outro_cpf" });
      continue;
    }

    nomesReservados.add(linha.nome);
    criar.push({ ...linha, id: null, motivo: "novo" });
  }

  return {
    criar,
    vincular,
    ignorar,
    erros,
    resumo: {
      total: criar.length + vincular.length + ignorar.length + erros.length,
      criar: criar.length,
      vincular: vincular.length,
      ignorar: ignorar.length,
      erros: erros.length,
    },
  };
}
