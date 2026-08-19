import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

/**
 * `mcp-bfx` — servidor MCP para o agente de WhatsApp.
 * Spec: docs/MCP-AGENTE-SPEC.md
 *
 * O requisito que estes testes protegem é de correção, não de qualidade: um
 * cliente final jamais pode obter dado de outro cliente. Vários testes abaixo
 * existem só para que uma refatoração que enfraqueça isso falhe alto.
 */

const dbMock = {
  $queryRaw: vi.fn(),
  parcelaVencimento: { findMany: vi.fn() },
  cliente: { findUnique: vi.fn() },
  venda: { findMany: vi.fn() },
  produto: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const buscaMock = { buscarProdutos: vi.fn() };
vi.mock("@/lib/busca-produtos", () => buscaMock);

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres-ok";
process.env.MCP_AGENTE_SECRET = SEGREDO;
process.env.SESSION_SECRET = "outro-segredo-totalmente-diferente-com-32+";

const { POST } = await import("@/app/api/mcp/agente/route");
const { variantesTelefone, casaTelefone } = await import("@/lib/mcp-agente");

async function assinar(
  telefone: string,
  opts: { segredo?: string; aud?: string; expiraEm?: string } = {},
) {
  const chave = new TextEncoder().encode(opts.segredo ?? SEGREDO);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(telefone)
    .setAudience(opts.aud ?? "mcp-bfx")
    .setIssuedAt()
    .setExpirationTime(opts.expiraEm ?? "5m")
    .sign(chave);
}

async function rpc(
  metodo: string,
  params: unknown,
  token: string | null,
  id: number | null = 1,
) {
  const req = new Request("http://local/api/mcp/agente", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      ...(id === null ? {} : { id }),
      method: metodo,
      params,
    }),
  });
  const res = await POST(req);
  const texto = await res.text();
  return { status: res.status, body: texto ? JSON.parse(texto) : null };
}

/** O cliente 7 é o dono do telefone do token em todos os testes de escopo. */
const DONO = { id: 7, nome: "Cliente Dono", telefone: "(11) 98888-7777" };
const TELEFONE_TOKEN = "5511988887777";

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$queryRaw.mockResolvedValue([DONO]);
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
  dbMock.venda.findMany.mockResolvedValue([]);
  dbMock.produto.findMany.mockResolvedValue([]);
  dbMock.cliente.findUnique.mockResolvedValue({ ...DONO, renda: 3000 });
});

describe("autenticação de máquina", () => {
  it("sem Authorization responde 401 e não toca no banco", async () => {
    const { status } = await rpc("tools/list", {}, null);
    expect(status).toBe(401);
    expect(dbMock.$queryRaw).not.toHaveBeenCalled();
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });

  it("token assinado com o SESSION_SECRET é recusado", async () => {
    // O segredo de sessão assina credencial de usuário interno, inclusive
    // admin. Se ele valesse aqui, um vazamento de um viraria acesso ao outro.
    const token = await assinar(TELEFONE_TOKEN, {
      segredo: process.env.SESSION_SECRET,
    });
    const { status } = await rpc("tools/list", {}, token);
    expect(status).toBe(401);
  });

  it("token sem audience mcp-bfx é recusado", async () => {
    const token = await assinar(TELEFONE_TOKEN, { aud: "outra-coisa" });
    expect((await rpc("tools/list", {}, token)).status).toBe(401);
  });

  it("token expirado é recusado", async () => {
    const token = await assinar(TELEFONE_TOKEN, { expiraEm: "-1m" });
    expect((await rpc("tools/list", {}, token)).status).toBe(401);
  });
});

describe("protocolo MCP", () => {
  it("initialize devolve versão de protocolo e serverInfo", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc(
      "initialize",
      { protocolVersion: "2025-06-18", capabilities: {} },
      token,
    );
    expect(body.jsonrpc).toBe("2.0");
    expect(body.result.protocolVersion).toBeTruthy();
    expect(body.result.serverInfo.name).toBe("mcp-bfx");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it("initialize diz ao modelo QUEM é o cliente, antes de ele falar", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc("initialize", {}, token);
    expect(body.result.instructions).toContain(DONO.nome);
    expect(body.result.instructions).toContain("Nunca peça CPF");
  });

  it("initialize avisa quando NÃO há cadastro, também antes de ele falar", async () => {
    // Sem isso, o modelo barato pede CPF ao cliente antes de chamar qualquer
    // ferramenta — e aí a mensagem de erro da ferramenta nunca é lida.
    dbMock.$queryRaw.mockResolvedValue([]);
    const token = await assinar("5511900000000");
    const { body } = await rpc("initialize", {}, token);
    expect(body.result.instructions).toContain("ATENÇÃO");
    expect(body.result.instructions).toContain("atendente");
  });

  it("notifications/initialized responde 202 sem corpo", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { status, body } = await rpc(
      "notifications/initialized",
      {},
      token,
      null,
    );
    expect(status).toBe(202);
    expect(body).toBeNull();
  });

  it("método desconhecido devolve -32601", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc("resources/list", {}, token);
    expect(body.error.code).toBe(-32601);
  });
});

describe("superfície de tools", () => {
  it("expõe exatamente as quatro tools da spec", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc("tools/list", {}, token);
    expect(body.result.tools.map((t: { name: string }) => t.name).sort()).toEqual([
      "catalogo_produtos",
      "meu_limite",
      "meus_boletos",
      "minhas_parcelas",
    ]);
  });

  it("NENHUMA tool aceita identificador de cliente no schema", async () => {
    // Este é o teste estrutural da spec: não se pode pedir o que a API não
    // sabe expressar. Se alguém adicionar `clienteId` a um schema, falha aqui.
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc("tools/list", {}, token);
    const proibidos = [
      "clienteid",
      "cliente_id",
      "clientenome",
      "cliente_nome",
      "telefone",
      "cpf",
      "cnpj",
      "matricula",
    ];
    for (const tool of body.result.tools) {
      const schema = JSON.stringify(tool.inputSchema).toLowerCase();
      for (const campo of proibidos) {
        expect(schema, `${tool.name} não pode aceitar ${campo}`).not.toContain(
          campo,
        );
      }
    }
  });

  it("não expõe consulta_sql, escrita nem agregado da empresa", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc("tools/list", {}, token);
    const nomes: string[] = body.result.tools.map((t: { name: string }) => t.name);
    for (const proibida of [
      "consulta_sql",
      "listar_inadimplentes",
      "fluxo_caixa",
      "resumo_financeiro",
      "consultar_comissoes",
      "criar_venda",
      "atualizar_usuario",
      "listar_clientes",
    ]) {
      expect(nomes).not.toContain(proibida);
    }
  });

  it("tools/call de tool inexistente não executa nada", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc(
      "tools/call",
      { name: "consulta_sql", arguments: {} },
      token,
    );
    expect(body.error ?? body.result.isError).toBeTruthy();
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });
});

describe("escopo por cliente — imposto no servidor", () => {
  it("minhas_parcelas consulta apenas o cliente resolvido do token", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    await rpc("tools/call", { name: "minhas_parcelas", arguments: {} }, token);
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(where.venda.clienteId).toBe(DONO.id);
  });

  it("argumento clienteId de outro cliente é ignorado, não obedecido", async () => {
    // O modelo escreve os argumentos. Aqui ele tenta apontar para o cliente 999.
    const token = await assinar(TELEFONE_TOKEN);
    await rpc(
      "tools/call",
      {
        name: "minhas_parcelas",
        arguments: { clienteId: 999, clienteNome: "Outra Pessoa" },
      },
      token,
    );
    const where = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(where.venda.clienteId).toBe(DONO.id);
    expect(JSON.stringify(where)).not.toContain("999");
    expect(JSON.stringify(where)).not.toContain("Outra Pessoa");
  });

  it("meus_boletos e meu_limite também ficam presos ao cliente do token", async () => {
    const token = await assinar(TELEFONE_TOKEN);
    await rpc("tools/call", { name: "meus_boletos", arguments: { clienteId: 999 } }, token);
    expect(dbMock.venda.findMany.mock.calls[0][0].where.clienteId).toBe(DONO.id);

    await rpc("tools/call", { name: "meu_limite", arguments: { clienteId: 999 } }, token);
    expect(dbMock.cliente.findUnique.mock.calls[0][0].where.id).toBe(DONO.id);
  });

  it("telefone sem cadastro não consulta dado nenhum", async () => {
    dbMock.$queryRaw.mockResolvedValue([]);
    const token = await assinar("5511900000000");
    const { body } = await rpc(
      "tools/call",
      { name: "minhas_parcelas", arguments: {} },
      token,
    );
    expect(JSON.stringify(body)).toContain("cliente_nao_identificado");
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });

  it("erro de identificação instrui o modelo a NÃO pedir documento", async () => {
    // Observado rodando de verdade: sem essa instrução, o modelo pede CPF ao
    // cliente — e nenhuma tool aceita CPF, por desenho. Ele prometeria algo
    // que não pode cumprir. A mensagem de erro é o único canal que chega ao
    // modelo naquele instante, então é nela que a orientação tem de estar.
    dbMock.$queryRaw.mockResolvedValue([]);
    const token = await assinar("5511900000000");
    const { body } = await rpc(
      "tools/call",
      { name: "minhas_parcelas", arguments: {} },
      token,
    );
    const texto = JSON.stringify(body);
    expect(texto).toContain("instrucao_interna_nao_repetir");
    expect(texto).toContain("para_o_cliente");
    expect(texto).toContain("atendente");
  });

  it("telefone ambíguo falha fechado — nunca escolhe o primeiro", async () => {
    // `Cliente.telefone` não é único no schema. Escolher uma linha entre duas
    // entrega dado do cliente errado com 50% de chance.
    dbMock.$queryRaw.mockResolvedValue([
      { id: 7, nome: "Um", telefone: "(11) 98888-7777" },
      { id: 8, nome: "Outro", telefone: "11988887777" },
    ]);
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc(
      "tools/call",
      { name: "minhas_parcelas", arguments: {} },
      token,
    );
    expect(JSON.stringify(body)).toContain("identificacao_ambigua");
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });

  it("resultado truncado pelo teto vira ambiguidade, não escolha silenciosa", async () => {
    // Se o LIMIT cortar a lista, pode haver um segundo cadastro com o mesmo
    // número fora do corte. Devolver o único que casou dentro do corte seria
    // entregar o cliente errado sem que nada indicasse o problema.
    dbMock.$queryRaw.mockResolvedValue(
      Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        nome: `C${i}`,
        telefone: i === 0 ? DONO.telefone : "(99) 90000-0000",
      })),
    );
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc(
      "tools/call",
      { name: "minhas_parcelas", arguments: {} },
      token,
    );
    expect(JSON.stringify(body)).toContain("identificacao_ambigua");
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  });

  it("erro interno não vaza detalhe de banco para o modelo", async () => {
    dbMock.parcelaVencimento.findMany.mockRejectedValue(
      new Error('relation "parcelas_vencimento" does not exist'),
    );
    const token = await assinar(TELEFONE_TOKEN);
    const { body } = await rpc(
      "tools/call",
      { name: "minhas_parcelas", arguments: {} },
      token,
    );
    const texto = JSON.stringify(body);
    expect(texto).not.toContain("parcelas_vencimento");
    expect(texto).not.toContain("relation");
    expect(body.result.isError).toBe(true);
  });

  it("avisa quando nada casou pelo nome — senão o agente oferece qualquer coisa", async () => {
    // Medido: pedindo capacete, o agente ofereceu mochila e blusa de tricô.
    // O `aproximado: true` em cada item não bastou; o aviso vai no resultado
    // da tool porque é o texto que o modelo lê logo antes de responder.
    dbMock.$queryRaw.mockResolvedValue([]);
    buscaMock.buscarProdutos.mockResolvedValue([
      { nome: "MOCHILA SPORT MULTI", marca: null, categoria: "acessorios",
        valorVenda: 18900, qtdEstoque: 3, imagem: null, via: "significado" },
    ]);
    const token = await assinar("5511900000000");
    const { body } = await rpc(
      "tools/call",
      { name: "catalogo_produtos", arguments: { busca: "capacete de motocicleta" } },
      token,
    );
    const dados = JSON.parse(body.result.content[0].text);
    expect(dados.aviso).toMatch(/Nenhum produto/i);
    expect(dados.produtos[0].aproximado).toBe(true);
  });

  it("não avisa quando o nome casou — o resultado é confiável", async () => {
    dbMock.$queryRaw.mockResolvedValue([]);
    buscaMock.buscarProdutos.mockResolvedValue([
      { nome: "CAPACETE LS2", marca: "LS2", categoria: "acessorios",
        valorVenda: 50000, qtdEstoque: 1, imagem: null, via: "texto" },
    ]);
    const token = await assinar("5511900000000");
    const { body } = await rpc(
      "tools/call",
      { name: "catalogo_produtos", arguments: { busca: "capacete" } },
      token,
    );
    const dados = JSON.parse(body.result.content[0].text);
    expect(dados.aviso).toBeUndefined();
    expect(dados.produtos[0].aproximado).toBe(false);
  });

  it("catalogo_produtos funciona sem cadastro — não é dado pessoal", async () => {
    dbMock.$queryRaw.mockResolvedValue([]);
    const token = await assinar("5511900000000");
    const { body } = await rpc(
      "tools/call",
      { name: "catalogo_produtos", arguments: {} },
      token,
    );
    expect(body.result.isError).toBeFalsy();
    expect(dbMock.produto.findMany).toHaveBeenCalled();
  });
});

describe("casamento de telefone contra os formatos reais do banco", () => {
  // Formatos medidos no bfx-db: "(99) 99999-9999" (633), "99 9999-9999" (91),
  // "99999999999" (32), "99 999999999", "(99)99999-9999", "999999999" (sem DDD).
  it("ignora máscara: os formatos reais do banco casam com o token", async () => {
    for (const armazenado of [
      "(11) 98888-7777",
      "11 98888-7777",
      "11988887777",
      "11 988887777",
      "(11)98888-7777",
      "(11)988887777",
      "+55 (11) 98888-7777",
    ]) {
      expect(casaTelefone(armazenado, TELEFONE_TOKEN), armazenado).toBe(true);
    }
  });

  it("aceita a variante sem o nono dígito", () => {
    expect(casaTelefone("(11) 8888-7777", TELEFONE_TOKEN)).toBe(true);
  });

  it("DDD diferente NÃO casa — a colisão que uma comparação por sufixo criaria", () => {
    expect(casaTelefone("(21) 98888-7777", TELEFONE_TOKEN)).toBe(false);
  });

  it("número sem DDD no banco não é identificável e não casa", () => {
    // 6 + 4 registros reais estão assim. Sem DDD não há identidade: casar
    // pelo sufixo entregaria o cliente errado.
    expect(casaTelefone("98888-7777", TELEFONE_TOKEN)).toBe(false);
    expect(casaTelefone("988887777", TELEFONE_TOKEN)).toBe(false);
  });

  it("aceita o JID do WhatsApp, com e sem sufixo de aparelho", () => {
    // É esta a forma que o Chatwoot entrega em `sender.identifier`. O sufixo
    // `:12` é dígito: sem cortá-lo antes, viraria um número de 15 dígitos que
    // não casa com ninguém e o cliente ficaria sem atendimento.
    expect(casaTelefone(DONO.telefone, "5511988887777@s.whatsapp.net")).toBe(true);
    expect(casaTelefone(DONO.telefone, "5511988887777:12@s.whatsapp.net")).toBe(true);
    expect(casaTelefone(DONO.telefone, "+55 11 98888-7777")).toBe(true);
  });

  it("telefone nulo ou vazio nunca casa", () => {
    expect(casaTelefone(null, TELEFONE_TOKEN)).toBe(false);
    expect(casaTelefone("", TELEFONE_TOKEN)).toBe(false);
    expect(casaTelefone("   ", TELEFONE_TOKEN)).toBe(false);
  });

  it("variantes cobrem as duas formas nacionais e nada além", () => {
    const v = variantesTelefone(TELEFONE_TOKEN);
    expect(v).toContain("11988887777");
    expect(v).toContain("1188887777");
    expect(v.every((x) => x.length === 10 || x.length === 11)).toBe(true);
  });
});
