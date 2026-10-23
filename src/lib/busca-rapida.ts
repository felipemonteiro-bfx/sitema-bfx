/**
 * Interpretação da busca global (⌘K): transforma uma frase solta em filtros
 * que o /historico entende, sem tocar no banco (módulo puro, fácil de testar).
 *
 * Regra de segurança: quem não é admin (`escopo` informado) NUNCA recebe uma
 * sugestão de outro vendedor. Se o texto citar outra pessoa, a citação é
 * descartada e a sugestão fica travada no próprio vendedor.
 */
import { FORMA_PAGAMENTO, formaPagamentoLabel, type FormaPagamento } from "@/lib/forma-pagamento";

export type AssinaturaFiltro = "pendente" | "assinado";

export type ConsultaInterpretada = {
  /** Texto livre que sobrou depois de tirar os filtros reconhecidos. */
  termo: string;
  idVenda?: number;
  vendedor?: string;
  assinatura?: AssinaturaFiltro;
  forma?: FormaPagamento;
  /** Link para o /historico com os mesmos filtros (só quando algum filtro foi reconhecido). */
  urlHistorico?: string;
};

/** Minúsculas, sem acento, só letras/números/# separados por um espaço. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9# ]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

// Ordem importa: a frase mais longa tem de ser tentada antes da palavra solta.
const FRASES_PENDENTE = ["aguardando assinatura", "pendentes", "pendente"];
const FRASES_ASSINADO = ["assinadas", "assinados", "assinada", "assinado"];
const FRASES_FOLHA = ["desconto em folha", "desconto folha", "folha"];

// Palavras de ligação que só atrapalham a busca por texto quando já há filtro.
const LIGACAO = new Set(["vendas", "venda", "de", "da", "do", "das", "dos", "com", "em", "a", "as", "o", "os", "no", "na", "por"]);

/** Tira a frase do texto (já com espaços nas pontas); devolve se achou. */
function extrair(texto: string, frases: string[]): { achou: boolean; texto: string } {
  for (const frase of frases) {
    const partes = texto.split(` ${frase} `);
    if (partes.length > 1) return { achou: true, texto: partes.join(" ") };
  }
  return { achou: false, texto };
}

/** Acha um vendedor citado no texto: nome completo primeiro, depois o primeiro nome (se único). */
function acharVendedor(texto: string, vendedores: string[]): { nome?: string; texto: string } {
  const normalizados = vendedores
    .map((original) => ({ original, norm: normalizarBusca(original) }))
    .filter((v) => v.norm);

  const porTamanho = [...normalizados].sort((a, b) => b.norm.length - a.norm.length);
  for (const v of porTamanho) {
    const partes = texto.split(` ${v.norm} `);
    if (partes.length > 1) return { nome: v.original, texto: partes.join(" ") };
  }

  for (const v of porTamanho) {
    const primeiro = v.norm.split(" ")[0];
    if (primeiro.length < 3) continue;
    const donos = normalizados.filter((o) => o.norm.split(" ")[0] === primeiro);
    if (donos.length !== 1) continue;
    const partes = texto.split(` ${primeiro} `);
    if (partes.length > 1) return { nome: v.original, texto: partes.join(" ") };
  }
  return { texto };
}

/**
 * @param texto      o que a pessoa digitou
 * @param vendedores nomes de exibição conhecidos
 * @param escopo     vendedor logado quando NÃO é admin; admin passa `undefined`
 */
export function interpretarConsulta(texto: string, vendedores: string[], escopo?: string): ConsultaInterpretada {
  const norm = normalizarBusca(texto);

  const soId = norm.split(" ").length === 1 ? norm.match(/^#?(\d{1,9})$/) : null;
  if (soId) {
    // Parse estrito: só dígitos (a regex já garante), inteiro seguro e positivo.
    const id = Number(soId[1]);
    if (Number.isSafeInteger(id) && id > 0) return { termo: "", idVenda: id };
  }

  let resto = ` ${norm} `;

  const achouVendedor = acharVendedor(resto, vendedores);
  resto = achouVendedor.texto;

  const pendente = extrair(resto, FRASES_PENDENTE);
  resto = pendente.texto;
  const assinado = extrair(resto, FRASES_ASSINADO);
  resto = assinado.texto;
  const folha = extrair(resto, FRASES_FOLHA);
  resto = folha.texto;

  // "pendentes" e "assinadas" na mesma frase se contradizem: nenhum filtro vale.
  const assinatura: AssinaturaFiltro | undefined =
    pendente.achou === assinado.achou ? undefined : pendente.achou ? "pendente" : "assinado";
  const forma = folha.achou ? FORMA_PAGAMENTO.DESCONTO_FOLHA : undefined;

  const algumFiltro = Boolean(achouVendedor.nome || assinatura || forma);
  const palavras = resto.split(" ").filter(Boolean);
  const termo = (algumFiltro ? palavras.filter((p) => !LIGACAO.has(p)) : palavras).join(" ");

  // Não-admin: o vendedor é sempre o próprio, e só aparece se houve algum filtro.
  const vendedor = escopo !== undefined ? (algumFiltro ? escopo : undefined) : achouVendedor.nome;

  const consulta: ConsultaInterpretada = { termo };
  if (vendedor) consulta.vendedor = vendedor;
  if (assinatura) consulta.assinatura = assinatura;
  if (forma) consulta.forma = forma;

  if (vendedor || assinatura || forma) {
    const params = new URLSearchParams();
    if (vendedor) params.set("vendedor", vendedor);
    if (forma) params.set("formaPagamento", forma);
    if (assinatura) params.set("assinatura", assinatura);
    if (termo) params.set("q", termo);
    consulta.urlHistorico = `/historico?${params.toString()}`;
  }
  return consulta;
}

/** Título curto da sugestão, ex.: "Vendas de Ana · aguardando assinatura · Desconto em folha". */
export function rotuloSugestao(c: ConsultaInterpretada): string {
  const partes = [c.vendedor ? `Vendas de ${c.vendedor}` : "Vendas"];
  if (c.assinatura) partes.push(c.assinatura === "pendente" ? "aguardando assinatura" : "assinadas");
  if (c.forma) partes.push(formaPagamentoLabel(c.forma));
  if (c.termo) partes.push(`“${c.termo}”`);
  return partes.join(" · ");
}

export type StatusAssinatura = "assinado" | "pendente" | null;

/** Status de assinatura como o Histórico mostra: assinado, aguardando (tem link) ou sem assinatura. */
export function statusAssinaturaDe(venda: {
  assinaturaToken?: string | null;
  assinatura?: { assinaturaStatus: string | null } | null;
}): StatusAssinatura {
  if (venda.assinatura?.assinaturaStatus === "assinado") return "assinado";
  if (venda.assinaturaToken) return "pendente";
  return null;
}
