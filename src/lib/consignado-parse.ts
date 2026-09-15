import { lerZip } from "@/lib/xlsx/ler";

export const LIMITE_LINHAS_IMPORT_CONSIGNADO = 5000;

export const CABECALHOS_OBRIGATORIOS = [
  "ifConcessora.codigo",
  "contrato",
  "cpf",
  "valorParcela",
  "competenciaInicioDesconto",
  "competenciaFimDesconto",
] as const;

export class ArquivoConsignadoInvalido extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArquivoConsignadoInvalido";
  }
}

export type LinhaConsignado = {
  linha: number;
  ifConcessoraCodigo: string;
  ifConcessoraDescricao: string | null;
  contrato: string;
  cpf: string | null;
  matricula: string | null;
  numeroInscricaoEmpregador: string | null;
  nomeTrabalhador: string;
  nomeEmpregador: string | null;
  dataInicioContrato: string | null;
  dataFimContrato: string | null;
  competenciaInicioDesconto: string;
  competenciaFimDesconto: string;
  totalParcelas: number | null;
  valorParcela: number;
  valorEmprestimo: number | null;
  valorLiberado: number | null;
  qtdPagamentos: number | null;
  qtdEscrituracoes: number | null;
  categoriaTrabalhador: string | null;
  competenciaArquivo: string | null;
  numeroInscricaoEstabelecimento: string | null;
  dataAdmissao: string | null;
};

export type ErroParseConsignado = { linha: number; motivo: string; conteudo: string };
export type AvisoParseConsignado = { linha: number; motivo: string; substituidaPor?: number };

export type ResultadoParseConsignado = {
  linhas: LinhaConsignado[];
  erros: ErroParseConsignado[];
  avisos: AvisoParseConsignado[];
};

const CAMPOS_CABECALHO: Record<string, keyof Bruto> = {
  "ifconcessora.codigo": "ifConcessoraCodigo",
  "ifconcessora.descricao": "ifConcessoraDescricao",
  contrato: "contrato",
  cpf: "cpf",
  matricula: "matricula",
  numeroinscricaoempregador: "numeroInscricaoEmpregador",
  nometrabalhador: "nomeTrabalhador",
  nomeempregador: "nomeEmpregador",
  datainiciocontrato: "dataInicioContrato",
  datafimcontrato: "dataFimContrato",
  competenciainiciodesconto: "competenciaInicioDesconto",
  competenciafimdesconto: "competenciaFimDesconto",
  totalparcelas: "totalParcelas",
  valorparcela: "valorParcela",
  valoremprestimo: "valorEmprestimo",
  valorliberado: "valorLiberado",
  qtdpagamentos: "qtdPagamentos",
  qtdescrituracoes: "qtdEscrituracoes",
  codigocategoriatrabalhador: "categoriaTrabalhador",
  competencia: "competenciaArquivo",
  numeroinscricaoestabelecimento: "numeroInscricaoEstabelecimento",
  dataadmissao: "dataAdmissao",
};

type Bruto = {
  ifConcessoraCodigo: string;
  ifConcessoraDescricao: string;
  contrato: string;
  cpf: string;
  matricula: string;
  numeroInscricaoEmpregador: string;
  nomeTrabalhador: string;
  nomeEmpregador: string;
  dataInicioContrato: string;
  dataFimContrato: string;
  competenciaInicioDesconto: string;
  competenciaFimDesconto: string;
  totalParcelas: string;
  valorParcela: string;
  valorEmprestimo: string;
  valorLiberado: string;
  qtdPagamentos: string;
  qtdEscrituracoes: string;
  categoriaTrabalhador: string;
  competenciaArquivo: string;
  numeroInscricaoEstabelecimento: string;
  dataAdmissao: string;
};

function brutoVazio(): Bruto {
  return {
    ifConcessoraCodigo: "",
    ifConcessoraDescricao: "",
    contrato: "",
    cpf: "",
    matricula: "",
    numeroInscricaoEmpregador: "",
    nomeTrabalhador: "",
    nomeEmpregador: "",
    dataInicioContrato: "",
    dataFimContrato: "",
    competenciaInicioDesconto: "",
    competenciaFimDesconto: "",
    totalParcelas: "",
    valorParcela: "",
    valorEmprestimo: "",
    valorLiberado: "",
    qtdPagamentos: "",
    qtdEscrituracoes: "",
    categoriaTrabalhador: "",
    competenciaArquivo: "",
    numeroInscricaoEstabelecimento: "",
    dataAdmissao: "",
  };
}

function soDigitos(valor: string): string {
  return valor
    .split("")
    .filter((c) => c >= "0" && c <= "9")
    .join("");
}

function opcional(valor: string): string | null {
  const t = valor.trim();
  return t.length > 0 ? t : null;
}

function parseNumero(valor: string): number | null {
  const t = valor.trim();
  if (!t) return null;
  const n = Number(t.split(",").join("."));
  return Number.isFinite(n) ? n : null;
}

function competenciaValida(valor: string): boolean {
  const p = valor.trim().split("/");
  if (p.length !== 2) return false;
  const mes = Number(p[0]);
  const ano = Number(p[1]);
  return (
    p[0].length >= 1 &&
    p[0].length <= 2 &&
    p[1].length === 4 &&
    mes >= 1 &&
    mes <= 12 &&
    Number.isFinite(ano)
  );
}

function chaveCabecalho(celula: string): string {
  return celula.trim().toLocaleLowerCase("pt-BR");
}

function mapearCabecalhos(celulas: string[]): { mapa: (keyof Bruto | null)[]; faltando: string[] } {
  const mapa: (keyof Bruto | null)[] = celulas.map((c) => CAMPOS_CABECALHO[chaveCabecalho(c)] ?? null);
  const presentes = new Set(mapa.filter((m): m is keyof Bruto => m != null));
  const faltando = CABECALHOS_OBRIGATORIOS.filter((h) => {
    const campo = CAMPOS_CABECALHO[chaveCabecalho(h)];
    return !presentes.has(campo);
  });
  return { mapa, faltando };
}

function brutoDeCelulas(celulas: string[], mapa: (keyof Bruto | null)[]): Bruto {
  const bruto = brutoVazio();
  for (let i = 0; i < mapa.length; i++) {
    const campo = mapa[i];
    if (!campo) continue;
    bruto[campo] = (celulas[i] ?? "").trim();
  }
  return bruto;
}

function linhaDeBruto(bruto: Bruto, numeroLinha: number): LinhaConsignado | ErroParseConsignado {
  const contrato = bruto.contrato.trim();
  const financeira = bruto.ifConcessoraCodigo.trim();
  const cpf = soDigitos(bruto.cpf) || null;
  const matricula = opcional(bruto.matricula);
  const valorParcela = parseNumero(bruto.valorParcela);
  const inicio = bruto.competenciaInicioDesconto.trim();
  const fim = bruto.competenciaFimDesconto.trim();
  const conteudo = contrato || bruto.nomeTrabalhador || `linha ${numeroLinha}`;

  if (!financeira) return { linha: numeroLinha, motivo: "sem_financeira", conteudo };
  if (!contrato) return { linha: numeroLinha, motivo: "sem_contrato", conteudo };
  if (!cpf && !matricula) return { linha: numeroLinha, motivo: "sem_cpf_nem_matricula", conteudo };
  if (valorParcela == null) return { linha: numeroLinha, motivo: "valor_parcela_invalido", conteudo };
  if (!competenciaValida(inicio) || !competenciaValida(fim)) {
    return { linha: numeroLinha, motivo: "competencia_invalida", conteudo };
  }

  return {
    linha: numeroLinha,
    ifConcessoraCodigo: financeira,
    ifConcessoraDescricao: opcional(bruto.ifConcessoraDescricao),
    contrato,
    cpf,
    matricula,
    numeroInscricaoEmpregador: soDigitos(bruto.numeroInscricaoEmpregador) || null,
    nomeTrabalhador: bruto.nomeTrabalhador.trim(),
    nomeEmpregador: opcional(bruto.nomeEmpregador),
    dataInicioContrato: opcional(bruto.dataInicioContrato),
    dataFimContrato: opcional(bruto.dataFimContrato),
    competenciaInicioDesconto: inicio,
    competenciaFimDesconto: fim,
    totalParcelas: parseNumero(bruto.totalParcelas),
    valorParcela,
    valorEmprestimo: parseNumero(bruto.valorEmprestimo),
    valorLiberado: parseNumero(bruto.valorLiberado),
    qtdPagamentos: parseNumero(bruto.qtdPagamentos),
    qtdEscrituracoes: parseNumero(bruto.qtdEscrituracoes),
    categoriaTrabalhador: opcional(bruto.categoriaTrabalhador),
    competenciaArquivo: opcional(bruto.competenciaArquivo),
    numeroInscricaoEstabelecimento: soDigitos(bruto.numeroInscricaoEstabelecimento) || null,
    dataAdmissao: opcional(bruto.dataAdmissao),
  };
}

function chaveContrato(linha: LinhaConsignado): string {
  return `${linha.ifConcessoraCodigo}\0${linha.contrato}`;
}

function ehErro(item: LinhaConsignado | ErroParseConsignado): item is ErroParseConsignado {
  return "motivo" in item && !("valorParcela" in item && typeof (item as LinhaConsignado).valorParcela === "number");
}

function consolidarLimpo(itens: Array<LinhaConsignado | ErroParseConsignado>): ResultadoParseConsignado {
  const erros: ErroParseConsignado[] = [];
  const avisos: AvisoParseConsignado[] = [];
  const porChave = new Map<string, LinhaConsignado>();

  for (const item of itens) {
    if (ehErro(item)) {
      erros.push(item);
      continue;
    }
    const chave = chaveContrato(item);
    const anterior = porChave.get(chave);
    if (anterior) {
      avisos.push({
        linha: anterior.linha,
        motivo: "duplicata_substituida",
        substituidaPor: item.linha,
      });
    }
    porChave.set(chave, item);
  }

  return { linhas: [...porChave.values()], erros, avisos };
}

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

export function parseCsvConsignado(texto: string): ResultadoParseConsignado {
  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const brutas = semBom.split(/\r?\n/);
  const primeiraNaoVazia = brutas.find((l) => l.trim().length > 0) ?? "";
  const separador = primeiraNaoVazia.includes(";") ? ";" : ",";

  let indiceCabecalho = -1;
  for (let i = 0; i < brutas.length; i++) {
    if (brutas[i].trim().length > 0) {
      indiceCabecalho = i;
      break;
    }
  }
  if (indiceCabecalho < 0) {
    throw new ArquivoConsignadoInvalido("Arquivo vazio.");
  }

  const { mapa, faltando } = mapearCabecalhos(dividirLinhaCsv(brutas[indiceCabecalho], separador));
  if (faltando.length > 0) {
    throw new ArquivoConsignadoInvalido(
      `Cabeçalho inválido. Faltam colunas: ${faltando.join(", ")}.`,
    );
  }

  const dados = brutas.slice(indiceCabecalho + 1).filter((l) => {
    const celulas = dividirLinhaCsv(l, separador);
    return !celulas.every((c) => c.trim().length === 0);
  });
  if (dados.length > LIMITE_LINHAS_IMPORT_CONSIGNADO) {
    throw new ArquivoConsignadoInvalido(
      `Arquivo acima do limite de ${LIMITE_LINHAS_IMPORT_CONSIGNADO} linhas.`,
    );
  }

  const itens: Array<LinhaConsignado | ErroParseConsignado> = [];
  for (let i = indiceCabecalho + 1; i < brutas.length; i++) {
    const celulas = dividirLinhaCsv(brutas[i], separador);
    if (celulas.every((c) => c.trim().length === 0)) continue;
    itens.push(linhaDeBruto(brutoDeCelulas(celulas, mapa), i + 1));
  }
  return consolidarLimpo(itens);
}

function attr(tag: string, nome: string): string | null {
  const chave = `${nome}="`;
  const i = tag.indexOf(chave);
  if (i < 0) return null;
  const start = i + chave.length;
  const end = tag.indexOf('"', start);
  if (end < 0) return null;
  return tag.slice(start, end);
}

function decodeXml(texto: string): string {
  return texto
    .split("&lt;")
    .join("<")
    .split("&gt;")
    .join(">")
    .split("&quot;")
    .join('"')
    .split("&apos;")
    .join("'")
    .split("&amp;")
    .join("&");
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const parts = xml.split("<si");
  for (let i = 1; i < parts.length; i++) {
    const end = parts[i].indexOf("</si>");
    const body = end >= 0 ? parts[i].slice(0, end) : parts[i];
    const texts: string[] = [];
    const tParts = body.split("<t");
    for (let j = 1; j < tParts.length; j++) {
      const gt = tParts[j].indexOf(">");
      const close = tParts[j].indexOf("</t>");
      if (gt >= 0 && close > gt) texts.push(decodeXml(tParts[j].slice(gt + 1, close)));
    }
    out.push(texts.join(""));
  }
  return out;
}

function colRow(ref: string): { col: string; row: number } {
  const chars = ref.split("");
  let i = 0;
  let col = "";
  while (i < chars.length && chars[i] >= "A" && chars[i] <= "Z") {
    col += chars[i];
    i++;
  }
  return { col, row: Number(chars.slice(i).join("")) };
}

function celulasDaSheet(xml: string, sst: string[]): Map<number, Map<string, string>> {
  const rows = new Map<number, Map<string, string>>();
  const parts = xml.split("<c ");
  for (let i = 1; i < parts.length; i++) {
    const end = parts[i].indexOf("</c>");
    const selfEnd = parts[i].indexOf("/>");
    const chunk = end >= 0 ? parts[i].slice(0, end) : selfEnd >= 0 ? parts[i].slice(0, selfEnd) : parts[i];
    const tagFim = chunk.indexOf(">");
    const tag = tagFim >= 0 ? chunk.slice(0, tagFim) : chunk;
    const ref = attr(`x ${tag}`, "r") ?? attr(tag, "r");
    if (!ref) continue;
    const t = attr(`x ${tag}`, "t") ?? attr(tag, "t");
    let valor = "";
    const vOpen = chunk.indexOf("<v>");
    const vClose = chunk.indexOf("</v>");
    if (vOpen >= 0 && vClose > vOpen) valor = chunk.slice(vOpen + 3, vClose);
    else {
      const isOpen = chunk.indexOf("<t>");
      const isClose = chunk.indexOf("</t>");
      if (isOpen >= 0 && isClose > isOpen) valor = decodeXml(chunk.slice(isOpen + 3, isClose));
    }
    if (t === "s") {
      const idx = Number(valor);
      valor = Number.isFinite(idx) ? (sst[idx] ?? "") : "";
    } else if (t === "inlineStr") {
      // já extraído de <t>
    } else {
      valor = decodeXml(valor);
    }
    const { col, row } = colRow(ref);
    if (!Number.isFinite(row)) continue;
    let mapa = rows.get(row);
    if (!mapa) {
      mapa = new Map();
      rows.set(row, mapa);
    }
    mapa.set(col, valor);
  }
  return rows;
}

function alvoSheet(workbook: string, rels: string): string {
  const sheetsChunkStart = workbook.indexOf("<sheets");
  const sheetsChunk = sheetsChunkStart >= 0 ? workbook.slice(sheetsChunkStart) : workbook;
  const sheetParts = sheetsChunk.split("<sheet ");
  let chosenRid: string | null = null;
  let firstRid: string | null = null;
  for (let i = 1; i < sheetParts.length; i++) {
    const tag = sheetParts[i].slice(0, sheetParts[i].indexOf(">"));
    const name = attr(`x ${tag}`, "name") ?? "";
    const rid = attr(`x ${tag}`, "r:id") ?? attr(`x ${tag}`, "id");
    if (!firstRid && rid) firstRid = rid;
    if (name === "eConsignadoCLT" && rid) chosenRid = rid;
  }
  const rid = chosenRid ?? firstRid;
  if (!rid) throw new ArquivoConsignadoInvalido("xlsx sem aba.");
  const relParts = rels.split("<Relationship ");
  for (let i = 1; i < relParts.length; i++) {
    const tag = relParts[i].slice(0, relParts[i].indexOf("/>") >= 0 ? relParts[i].indexOf("/>") : relParts[i].indexOf(">"));
    const id = attr(`x ${tag}`, "Id");
    const target = attr(`x ${tag}`, "Target");
    if (id === rid && target) {
      return target.startsWith("xl/") ? target : `xl/${target.replace(/^\//, "")}`;
    }
  }
  throw new ArquivoConsignadoInvalido("xlsx sem worksheet.");
}

function colunasOrdenadas(cols: string[]): string[] {
  return [...cols].sort((a, b) => {
    const na = colRow(`${a}1`).col.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
    const nb = colRow(`${b}1`).col.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
    return na - nb;
  });
}

export function parseXlsxConsignado(bytes: Uint8Array): ResultadoParseConsignado {
  let arquivos: Map<string, string>;
  try {
    arquivos = lerZip(bytes);
  } catch {
    throw new ArquivoConsignadoInvalido("Arquivo xlsx inválido ou zip quebrado.");
  }
  const workbook = arquivos.get("xl/workbook.xml");
  const rels = arquivos.get("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) {
    throw new ArquivoConsignadoInvalido("xlsx sem workbook.");
  }
  const sheetPath = alvoSheet(workbook, rels);
  const sheet = arquivos.get(sheetPath);
  if (!sheet) throw new ArquivoConsignadoInvalido("xlsx sem a aba de dados.");
  const sst = arquivos.has("xl/sharedStrings.xml")
    ? sharedStrings(arquivos.get("xl/sharedStrings.xml")!)
    : [];
  const rows = celulasDaSheet(sheet, sst);
  const numeros = [...rows.keys()].sort((a, b) => a - b);
  if (numeros.length === 0) throw new ArquivoConsignadoInvalido("Arquivo vazio.");

  const headerRow = rows.get(numeros[0])!;
  const cols = colunasOrdenadas([...headerRow.keys()]);
  const cabecalhos = cols.map((c) => headerRow.get(c) ?? "");
  const { mapa, faltando } = mapearCabecalhos(cabecalhos);
  if (faltando.length > 0) {
    throw new ArquivoConsignadoInvalido(
      `Cabeçalho inválido. Faltam colunas: ${faltando.join(", ")}.`,
    );
  }

  const dataNums = numeros.slice(1);
  if (dataNums.length > LIMITE_LINHAS_IMPORT_CONSIGNADO) {
    throw new ArquivoConsignadoInvalido(
      `Arquivo acima do limite de ${LIMITE_LINHAS_IMPORT_CONSIGNADO} linhas.`,
    );
  }

  const itens: Array<LinhaConsignado | ErroParseConsignado> = [];
  for (const n of dataNums) {
    const mapaRow = rows.get(n)!;
    const celulas = cols.map((c) => mapaRow.get(c) ?? "");
    if (celulas.every((c) => c.trim().length === 0)) continue;
    itens.push(linhaDeBruto(brutoDeCelulas(celulas, mapa), n));
  }
  return consolidarLimpo(itens);
}

export function parseArquivoConsignado(
  nomeArquivo: string,
  conteudo: Uint8Array | string,
): ResultadoParseConsignado {
  const nome = nomeArquivo.toLocaleLowerCase("pt-BR");
  if (nome.endsWith(".xlsx")) {
    const bytes = typeof conteudo === "string" ? Buffer.from(conteudo) : conteudo;
    return parseXlsxConsignado(bytes);
  }
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
    const texto = typeof conteudo === "string" ? conteudo : Buffer.from(conteudo).toString("utf8");
    return parseCsvConsignado(texto);
  }
  throw new ArquivoConsignadoInvalido("Extensão inválida. Use .xlsx ou .csv.");
}

