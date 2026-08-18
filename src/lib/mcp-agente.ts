import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { buscarProdutos } from "@/lib/busca-produtos";

/**
 * `mcp-bfx` — servidor MCP para o agente de WhatsApp que atende o CLIENTE
 * FINAL da BFX. Spec: `docs/MCP-AGENTE-SPEC.md`.
 *
 * Este arquivo não tem relação com `src/lib/mcp.ts`, que serve o chat interno
 * (BFX Intelligence) a usuários `admin`/`vendedor` autenticados por cookie.
 * A separação é o ponto: aquele expõe as 32 `aiActions`, incluindo escrita e
 * `consulta_sql`; este expõe quatro leituras presas a um único cliente.
 *
 * A regra que governa o arquivo inteiro: **o escopo não é um argumento**.
 * Nenhuma tool daqui aceita identificador de cliente. A identidade chega no
 * token e é resolvida uma vez; toda consulta é filtrada por ela. Um modelo que
 * alucine o id de outra pessoa não tem onde escrevê-lo.
 */

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_NAME = "mcp-bfx";
export const AUDIENCE = "mcp-bfx";

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

function somenteDigitos(valor: string): string {
  // O WhatsApp entrega o contato como JID — `5511999990000@s.whatsapp.net`, e
  // com aparelho vinculado, `5511999990000:12@s.whatsapp.net`. O sufixo de
  // aparelho é dígito e entraria no número se não fosse cortado antes, virando
  // um telefone de 15 dígitos que não casa com ninguém.
  const semDominio = valor.split("@")[0];
  const semAparelho = semDominio.split(":")[0];
  return semAparelho.replace(/[^0-9]/g, "");
}

/**
 * Formas nacionais equivalentes de um telefone: sem máscara, sem código de
 * país, com e sem o nono dígito.
 *
 * Devolve vazio quando não há DDD. Os formatos reais do `bfx-db` incluem
 * registros de 9 dígitos (`999999999`), que são número de assinante sem DDD —
 * não identificam ninguém. Casá-los pelo sufixo entregaria o cliente errado,
 * então eles simplesmente não casam.
 */
export function variantesTelefone(valor: string | null | undefined): string[] {
  let d = somenteDigitos(valor ?? "");
  // O WhatsApp entrega `55` + DDD + número; o banco quase nunca tem o país.
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    d = d.slice(2);
  }
  if (d.length !== 10 && d.length !== 11) return [];

  const ddd = d.slice(0, 2);
  const assinante = d.slice(2);
  const formas = new Set<string>([d]);
  if (assinante.length === 9 && assinante.startsWith("9")) {
    formas.add(ddd + assinante.slice(1));
  }
  if (assinante.length === 8) {
    formas.add(ddd + "9" + assinante);
  }
  return Array.from(formas);
}

/**
 * Compara DDD + número por igualdade, nunca por sufixo. Comparar sufixo faria
 * `(21) 98888-7777` casar com `(11) 98888-7777` — dois clientes diferentes.
 */
export function casaTelefone(
  armazenado: string | null | undefined,
  doToken: string,
): boolean {
  const doBanco = variantesTelefone(armazenado);
  if (doBanco.length === 0) return false;
  const doContato = new Set(variantesTelefone(doToken));
  if (doContato.size === 0) return false;
  return doBanco.some((forma) => doContato.has(forma));
}

// ---------------------------------------------------------------------------
// Autenticação de máquina
// ---------------------------------------------------------------------------

function segredo(): Uint8Array | null {
  const bruto = process.env.MCP_AGENTE_SECRET;
  // Falha fechada: sem segredo configurado o servidor não atende ninguém, em
  // vez de cair num default que aceitaria token forjado.
  if (!bruto || bruto.length < 32) return null;
  return new TextEncoder().encode(bruto);
}

/**
 * Verifica o Bearer e devolve o telefone do contato.
 *
 * O segredo é próprio, separado do `SESSION_SECRET`: aquele assina sessão de
 * usuário interno, inclusive `admin`, e reaproveitá-lo faria de um vazamento
 * do segredo do agente um caminho para emitir sessão administrativa.
 *
 * A `audience` é verificada para que um token assinado com o mesmo segredo
 * para outro fim não seja aceito aqui.
 */
export async function verificarToken(
  authorization: string | null,
): Promise<{ telefone: string; nomeNoWhatsapp?: string } | null> {
  const chave = segredo();
  if (!chave) return null;
  if (!authorization || !authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave, {
      audience: AUDIENCE,
      // Algoritmo fixado. Uma chave simétrica já restringe a família HS*, mas
      // deixar a escolha aberta é o tipo de folga que vira confusão de
      // algoritmo depois de uma troca de biblioteca.
      algorithms: ["HS256"],
    });
    const telefone = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!telefone) return null;
    // Nome de exibição do WhatsApp, quando o gateway o envia. Não é
    // identidade — qualquer um escolhe o próprio nome de perfil — e por isso
    // NÃO participa da resolução do cadastro. Serve só para o agente chamar a
    // pessoa pelo nome em vez de "você".
    const nome =
      typeof payload.nome === "string" && payload.nome.trim()
        ? payload.nome.trim().slice(0, 60)
        : undefined;
    return { telefone, nomeNoWhatsapp: nome };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Escopo
// ---------------------------------------------------------------------------

export interface Escopo {
  clienteId: number;
  nome: string;
}

export type ResultadoEscopo =
  | { ok: true; escopo: Escopo }
  | { ok: false; erro: string; paraOCliente: string; instrucao: string };

interface LinhaCliente {
  id: number;
  nome: string;
  telefone: string | null;
}

/**
 * Resolve o telefone do contato para exatamente um cliente.
 *
 * Duas etapas porque as máscaras no banco variam (`(99) 99999-9999`,
 * `99 9999-9999`, `99999999999`, …): o SQL normaliza para dígitos e estreita
 * pelo sufixo, e o casamento exato — com DDD — acontece aqui.
 */
export async function resolverEscopo(
  telefoneDoContato: string,
): Promise<ResultadoEscopo> {
  const formas = variantesTelefone(telefoneDoContato);
  if (formas.length === 0) {
    return {
      ok: false,
      erro: "cliente_nao_identificado",
      paraOCliente: "Não localizei um cadastro com este número.",
      instrucao:
        "Não existe consulta por CPF, matrícula ou qualquer outro documento — " +
        "não peça nenhum. Diga ao cliente, com suas palavras, que não " +
        "localizou o cadastro e ofereça encaminhar para um atendente.",
    };
  }

  const sufixo = formas[0].slice(-8);
  // O teto existe para que um sufixo degenerado não varra a tabela inteira.
  // Ele é lido de volta logo abaixo: um resultado truncado esconderia um
  // segundo cadastro com o mesmo número, e a ambiguidade passaria despercebida
  // — que é exatamente o caso em que se entrega o cliente errado.
  const TETO = 200;
  const linhas = await prisma.$queryRaw<LinhaCliente[]>`
    SELECT id, nome, telefone
      FROM clientes
     WHERE regexp_replace(coalesce(telefone, ''), '[^0-9]', '', 'g') LIKE ${"%" + sufixo}
     LIMIT ${TETO}
  `;
  if ((linhas ?? []).length >= TETO) {
    return {
      ok: false,
      erro: "identificacao_ambigua",
      paraOCliente: "Não consegui confirmar seu cadastro com segurança.",
      instrucao:
        "Não tente desempatar pedindo dado ao cliente: diga que um atendente " +
        "vai assumir e encerre o assunto.",
    };
  }

  const candidatos = (linhas ?? []).filter((l) =>
    casaTelefone(l.telefone, telefoneDoContato),
  );

  if (candidatos.length === 0) {
    return {
      ok: false,
      erro: "cliente_nao_identificado",
      paraOCliente: "Não localizei um cadastro com este número.",
      instrucao:
        "Não existe consulta por CPF, matrícula ou qualquer outro documento — " +
        "não peça nenhum. Diga ao cliente, com suas palavras, que não " +
        "localizou o cadastro e ofereça encaminhar para um atendente.",
    };
  }
  if (candidatos.length > 1) {
    // FALHA FECHADA. `Cliente.telefone` não é único no schema; escolher uma
    // linha entre duas entrega dado do cliente errado com 50% de chance.
    return {
      ok: false,
      erro: "identificacao_ambigua",
      paraOCliente:
        "Preciso confirmar sua identidade antes de mostrar esses dados.",
      instrucao:
        "Este número aparece em mais de um cadastro. Não tente desempatar " +
        "pedindo dado ao cliente: diga que um atendente vai confirmar a " +
        "identidade e encerre o assunto.",
    };
  }
  return { ok: true, escopo: { clienteId: candidatos[0].id, nome: candidatos[0].nome } };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Allowlist escrita à mão, e não um filtro sobre `aiActions`.
 *
 * Derivar desta lista daquele array voltaria a expor por padrão toda ação nova
 * marcada `readOnly` — e `readOnly` separa leitura de escrita, não dado
 * próprio de dado alheio. Aqui, expor algo exige escrevê-lo neste arquivo.
 *
 * Nenhum `inputSchema` abaixo aceita identificador de pessoa. Isso é
 * verificado por teste.
 */
export const TOOLS: McpTool[] = [
  {
    name: "minhas_parcelas",
    description:
      "Parcelas das compras de quem está falando: valores, vencimentos, o que já foi pago e o que está em atraso.",
    inputSchema: {
      type: "object",
      properties: {
        apenasEmAberto: {
          type: "boolean",
          description: "Trazer só o que ainda não foi pago.",
        },
        apenasVencidas: {
          type: "boolean",
          description: "Trazer só o que está em atraso.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "meu_limite",
    description:
      "Margem disponível para uma nova compra de quem está falando, considerando o que já está comprometido.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "meus_boletos",
    description: "Boletos das compras de quem está falando, com o link quando já emitido.",
    inputSchema: {
      type: "object",
      properties: {
        apenasPendentes: {
          type: "boolean",
          description: "Trazer só os boletos ainda não emitidos.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "catalogo_produtos",
    description: "Produtos disponíveis para venda, com preço.",
    inputSchema: {
      type: "object",
      properties: {
        busca: { type: "string", description: "Filtra pelo nome do produto." },
        limite: { type: "integer", description: "Quantos itens trazer (máx. 50)." },
      },
      additionalProperties: false,
    },
  },
];

/** Tools que só fazem sentido para alguém com cadastro identificado. */
const EXIGEM_CADASTRO = new Set(["minhas_parcelas", "meu_limite", "meus_boletos"]);

export function exigeCadastro(nome: string): boolean {
  return EXIGEM_CADASTRO.has(nome);
}

function centavos(valor: number): number {
  return Math.trunc(valor * 100) / 100;
}

function dia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Executa uma tool.
 *
 * `args` vem do modelo e é usado apenas para filtros de apresentação
 * (`apenasEmAberto`, `busca`). O `escopo` vem do token e é a única fonte de
 * QUEM. Os dois nunca se misturam.
 */
export async function executarTool(
  nome: string,
  args: Record<string, unknown>,
  escopo: Escopo | null,
): Promise<unknown> {
  switch (nome) {
    case "minhas_parcelas": {
      if (!escopo) throw new Error("escopo_ausente");
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const parcelas = await prisma.parcelaVencimento.findMany({
        where: {
          venda: { clienteId: escopo.clienteId },
          ...(args.apenasEmAberto ? { paga: false } : {}),
          ...(args.apenasVencidas ? { paga: false, dataVencimento: { lt: hoje } } : {}),
        },
        include: { venda: { select: { id: true, produtoNome: true, parcelas: true } } },
        orderBy: { dataVencimento: "asc" },
        take: 200,
      });
      const emAberto = parcelas.filter((p) => !p.paga);
      return {
        cliente: escopo.nome,
        totalEmAberto: centavos(emAberto.reduce((s, p) => s + p.valorParcela, 0)),
        totalVencido: centavos(
          emAberto
            .filter((p) => p.dataVencimento < hoje)
            .reduce((s, p) => s + p.valorParcela, 0),
        ),
        parcelas: parcelas.map((p) => ({
          produto: p.venda.produtoNome,
          numeroParcela: `${p.numeroParcela}/${p.venda.parcelas}`,
          dataVencimento: dia(p.dataVencimento),
          valor: centavos(p.valorParcela),
          paga: p.paga,
          diasAtraso:
            !p.paga && p.dataVencimento < hoje
              ? Math.floor((hoje.getTime() - p.dataVencimento.getTime()) / 86400000)
              : 0,
        })),
      };
    }

    case "meu_limite": {
      if (!escopo) throw new Error("escopo_ausente");
      const cliente = await prisma.cliente.findUnique({
        where: { id: escopo.clienteId },
        select: { nome: true, renda: true },
      });
      if (!cliente) throw new Error("cliente_nao_identificado");
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const emAberto = await prisma.parcelaVencimento.findMany({
        where: {
          venda: { clienteId: escopo.clienteId },
          paga: false,
          dataVencimento: { gte: hoje },
        },
        select: { valorParcela: true, dataVencimento: true },
      });
      // Mesma regra do sistema interno: comprometimento é o maior total mensal
      // em aberto, e a margem é 35% da renda.
      const porMes = new Map<string, number>();
      for (const p of emAberto) {
        const mes = p.dataVencimento.toISOString().slice(0, 7);
        porMes.set(mes, (porMes.get(mes) ?? 0) + p.valorParcela);
      }
      const comprometido = porMes.size ? Math.max(...Array.from(porMes.values())) : 0;
      const margem = (cliente.renda ?? 0) * 0.35;
      return {
        cliente: cliente.nome,
        margemMensal: centavos(margem),
        comprometidoNoMes: centavos(comprometido),
        limiteDisponivel: centavos(Math.max(0, margem - comprometido)),
      };
    }

    case "meus_boletos": {
      if (!escopo) throw new Error("escopo_ausente");
      const vendas = await prisma.venda.findMany({
        where: {
          clienteId: escopo.clienteId,
          boleto: true,
          ...(args.apenasPendentes ? { boletoUrl: null } : {}),
        },
        select: {
          id: true,
          dataVenda: true,
          produtoNome: true,
          parcelas: true,
          valorVenda: true,
          boletoUrl: true,
        },
        orderBy: { dataVenda: "desc" },
        take: 50,
      });
      return {
        total: vendas.length,
        boletos: vendas.map((v) => ({
          dataVenda: dia(v.dataVenda),
          produto: v.produtoNome,
          parcelas: v.parcelas,
          valor: v.valorVenda == null ? null : centavos(v.valorVenda),
          emitido: Boolean(v.boletoUrl),
          link: v.boletoUrl ?? null,
        })),
      };
    }

    case "catalogo_produtos": {
      const busca = typeof args.busca === "string" ? args.busca.trim() : "";
      const limite = Math.min(Math.max(Number(args.limite) || 20, 1), 50);

      // Com termo de busca vai pela híbrida (texto + significado); sem termo é
      // só listagem. Ver `lib/busca-produtos.ts` para as medições que levaram
      // a esse desenho.
      const produtos = busca
        ? await buscarProdutos(busca, limite)
        : (
            await prisma.produto.findMany({
              select: {
                nome: true,
                marca: true,
                categoria: true,
                valorVenda: true,
                qtdEstoque: true,
                imagem: true,
              },
              orderBy: { nome: "asc" },
              take: limite,
            })
          ).map((p) => ({ ...p, via: "texto" as const }));

      return {
        total: produtos.length,
        // `custoPadrao` fica de fora deliberadamente: é o custo interno da BFX,
        // não é dado do cliente e não vai para o WhatsApp. `qtdEstoque` vira um
        // booleano pelo mesmo motivo — quantidade exata é informação comercial.
        produtos: produtos.map((p) => ({
          nome: p.nome,
          marca: p.marca,
          categoria: p.categoria,
          preco: p.valorVenda == null ? null : centavos(p.valorVenda),
          disponivel: (p.qtdEstoque ?? 0) > 0,
          // `true` = achado por aproximação, não por casar o que foi pedido.
          // O agente precisa saber para não apresentar como se fosse o item
          // exato — ver comentário em ProdutoEncontrado.
          aproximado: p.via === "significado",
          // Só URL http(s) sai daqui: o campo do cadastro também guarda
          // caminho local em alguns produtos, e isso não serve do outro lado.
          foto:
            typeof p.imagem === "string" && /^https?:\/\//i.test(p.imagem)
              ? p.imagem
              : null,
        })),
      };
    }
    default:
      throw new Error(`tool_desconhecida: ${nome}`);
  }
}

/**
 * Texto do campo `instructions` do `initialize` — que a spec do MCP define
 * como orientação do servidor para o cliente colocar no prompt do modelo.
 *
 * É o único canal que chega ao modelo ANTES de ele decidir o que dizer, e é
 * por isso que ele existe aqui. Medido rodando de verdade: instruído apenas
 * pelo prompt, o modelo barato pede CPF ao cliente antes de chamar qualquer
 * ferramenta — então a mensagem de erro da ferramenta, que já explica que não
 * existe consulta por documento, nunca chegava a ser lida. Resolvendo a
 * identidade aqui, o modelo abre a conversa sabendo se há cadastro.
 */
export async function instrucoesDaSessao(
  telefoneDoContato: string,
  nomeNoWhatsapp?: string,
): Promise<string> {
  const base =
    "As ferramentas deste servidor já sabem quem está falando: a identidade " +
    "vem da credencial da conexão, não dos argumentos. Nunca peça CPF, " +
    "número de cadastro, matrícula ou telefone — não existe consulta por " +
    "eles.";
  const apelido = nomeNoWhatsapp
    ? ` O nome que a pessoa usa no WhatsApp é "${nomeNoWhatsapp}" — pode chamá-la assim. Não é comprovação de identidade e não vale para liberar dado nenhum.`
    : "";
  const r = await resolverEscopo(telefoneDoContato);
  if (r.ok) {
    return `${base} O cliente desta conversa é ${r.escopo.nome}, já identificado.${apelido}`;
  }
  return `${base} ATENÇÃO: ${r.paraOCliente} ${r.instrucao}${apelido}`;
}
