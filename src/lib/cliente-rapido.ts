// Modulo PURO: zero imports, zero alias `@/`. E o contrato do qual a rota
// `POST /api/clientes` e o modal `CadastrarClienteRapidoDialog` dependem, e o
// que permite verificacao local via `node --input-type=module` nesta maquina
// (vitest nao roda aqui — ver <environment_constraints> do plano 07-02).

export type PayloadClienteRapido = {
  nome: string;
  telefone: string | null;
  cpf: string | null;
  empresaParceiraId: number | null;
};

export type ResultadoClienteRapido =
  | { ok: true; dados: PayloadClienteRapido }
  | { ok: false; erro: string };

/**
 * Normaliza o nome do cliente para comparacao/gravacao: converte para string,
 * remove espacos nas pontas, colapsa espacos internos em um unico espaco e
 * converte para caixa alta pt-BR. Mesma semantica de `normalizarNomeFornecedor`
 * (src/lib/fornecedor-import.ts); duplicada de proposito para os dois modulos
 * continuarem puros. Nunca lanca excecao — entradas vazias/nulas viram string
 * vazia.
 */
export function normalizarNomeCliente(nome: unknown): string {
  const bruto = String(nome ?? "");
  const colapsado = bruto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  return colapsado.toLocaleUpperCase("pt-BR");
}

/** Campo de texto opcional: trim, vira `null` quando fica em branco. */
function normalizarCampoOpcional(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

/**
 * `empresaParceiraId` aceita number ou string numerica; vira `null` quando
 * ausente, zero, negativo ou nao numerico.
 */
function normalizarEmpresaParceiraId(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.trunc(numero);
}

/**
 * Valida e normaliza o corpo recebido por `POST /api/clientes`. O contrato do
 * payload nasce completo (inclusive os campos que so a Task 2 exibe no modal)
 * para as camadas seguintes nao precisarem de retrabalho.
 */
export function montarPayloadClienteRapido(body: unknown): ResultadoClienteRapido {
  const objeto = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const nome = normalizarNomeCliente(objeto.nome);

  if (!nome) {
    return { ok: false, erro: "Informe o nome do cliente." };
  }

  return {
    ok: true,
    dados: {
      nome,
      telefone: normalizarCampoOpcional(objeto.telefone),
      cpf: normalizarCampoOpcional(objeto.cpf),
      empresaParceiraId: normalizarEmpresaParceiraId(objeto.empresaParceiraId),
    },
  };
}

/** Mensagem legivel para o vendedor no conflito de `Cliente.nome` `@unique` (T-07-06). */
export function mensagemClienteDuplicado(nome: string): string {
  return `Ja existe um cliente cadastrado com o nome "${nome}". Verifique antes de cadastrar novamente.`;
}

/**
 * Piso para disparar a consulta de nomes parecidos (D-05): `true` a partir de
 * 3 caracteres uteis — o mesmo piso que `GET /api/clientes/similar` aplica
 * antes de devolver lista vazia.
 */
export function deveConsultarSimilares(nome: unknown): boolean {
  const normalizado = normalizarNomeCliente(nome);
  return normalizado.length >= 3;
}
