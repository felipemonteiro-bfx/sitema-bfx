import { prisma } from "@/lib/db";
import { calcularDre, calcularFluxoCaixa } from "@/lib/finance";
import { valorTotalVenda } from "@/lib/venda-utils";
import {
  fuzzyFindClientes,
  fuzzyFindProdutos,
  fuzzyFindFornecedores,
  fuzzyFindClienteByNome,
  fuzzyFindProdutoByNome,
} from "@/lib/db-search";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export type ActionContext = {
  role: "admin" | "vendedor";
  username: string;
  displayName: string;
};

type AiActionDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  readOnly?: boolean;
  roles?: Array<"admin" | "vendedor">;
};

const toOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());
const requiredString = () =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1)
  );
const optionalString = () => toOptional(z.string().min(1));
const requiredNumber = () =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().refine(Number.isFinite)
  );
const optionalNumber = () => toOptional(z.coerce.number().refine(Number.isFinite));

const actionParamSchemas: Record<string, z.ZodTypeAny> = {
  listar_vendas: z.object({
    from: optionalString(),
    to: optionalString(),
    vendedor: optionalString(),
    clienteNome: optionalString(),
    clienteId: optionalNumber(),
    limit: optionalNumber(),
  }),
  criar_venda: z.object({
    dataVenda: requiredString(),
    vendedor: optionalString(),
    clienteId: requiredNumber(),
    produtoNome: requiredString(),
    custoProduto: optionalNumber(),
    valorVenda: requiredNumber(),
    valorFrete: optionalNumber(),
    custoEnvio: optionalNumber(),
    parcelas: optionalNumber(),
    antecipada: optionalNumber(),
  }),
  listar_clientes: z.object({
    search: optionalString(),
    limit: optionalNumber(),
  }),
  criar_cliente: z.object({
    nome: requiredString(),
    tipo: optionalString(),
    cpf: optionalString(),
    cnpj: optionalString(),
    renda: optionalNumber(),
    empresa: optionalString(),
    telefone: optionalString(),
    cep: optionalString(),
    endereco: optionalString(),
    matricula: optionalString(),
  }),
  listar_produtos: z.object({
    search: optionalString(),
    limit: optionalNumber(),
  }),
  criar_produto: z.object({
    nome: requiredString(),
    marca: optionalString(),
    ncm: optionalString(),
    custoPadrao: optionalNumber(),
    valorVenda: optionalNumber(),
  }),
  listar_despesas: z.object({
    from: optionalString(),
    to: optionalString(),
    limit: optionalNumber(),
  }),
  criar_despesa: z.object({
    descricao: requiredString(),
    valor: requiredNumber(),
    dataDespesa: requiredString(),
    tipo: optionalString(),
    categoria: optionalString(),
  }),
  listar_empresas: z.object({
    limit: optionalNumber(),
  }),
  criar_empresa: z.object({
    nome: requiredString(),
    responsavelRh: optionalString(),
    telefoneRh: optionalString(),
    emailRh: optionalString(),
  }),
  listar_usuarios: z.object({
    limit: optionalNumber(),
  }),
  criar_usuario: z.object({
    username: requiredString(),
    password: requiredString(),
    role: requiredString(),
    nomeExibicao: optionalString(),
  }),
  atualizar_usuario: z.object({
    id: requiredNumber(),
    username: optionalString(),
    password: optionalString(),
    role: optionalString(),
    nomeExibicao: optionalString(),
    metaMensal: optionalNumber(),
    comissaoPct: optionalNumber(),
  }),
  atualizar_venda: z.object({
    id: requiredNumber(),
    dataVenda: optionalString(),
    vendedor: optionalString(),
    produtoNome: optionalString(),
    valorVenda: optionalNumber(),
    valorFrete: optionalNumber(),
    custoEnvio: optionalNumber(),
    parcelas: optionalNumber(),
  }),
  atualizar_despesa: z.object({
    id: requiredNumber(),
    dataDespesa: optionalString(),
    descricao: optionalString(),
    valor: optionalNumber(),
    tipo: optionalString(),
  }),
  gerar_catalogo_produtos: z.object({
    search: optionalString(),
  }),
  consulta_sql: z.object({
    sql: requiredString(),
  }),
  consultar_parcelas_cliente: z.object({
    clienteNome: optionalString(),
    clienteId: optionalNumber(),
    apenasEmAberto: toOptional(z.coerce.boolean()),
    apenasVencidas: toOptional(z.coerce.boolean()),
  }),
  listar_inadimplentes: z.object({
    diasMinimos: optionalNumber(),
  }),
  consultar_limite_cliente: z.object({
    clienteNome: optionalString(),
    clienteId: optionalNumber(),
  }),
  // Financeiro
  resumo_financeiro: z.object({
    mesAno: optionalString(),
  }),
  fluxo_caixa: z.object({
    mesAno: optionalString(),
  }),
  // Fornecedores
  listar_fornecedores: z.object({
    search: optionalString(),
    limit: optionalNumber(),
  }),
  criar_fornecedor: z.object({
    nome: requiredString(),
    telefone: optionalString(),
  }),
  // Relatórios
  resumo_relatorio_vendas: z.object({
    from: optionalString(),
    to: optionalString(),
    vendedor: optionalString(),
    empresa: optionalString(),
  }),
  resumo_margem_produto: z.object({
    limit: optionalNumber(),
  }),
  // Assinatura digital
  consultar_assinaturas_pendentes: z.object({
    vendedor: optionalString(),
    limit: optionalNumber(),
  }),
  // Boletos
  listar_boletos: z.object({
    clienteNome: optionalString(),
    status: optionalString(),
    limit: optionalNumber(),
  }),
  // Auditoria
  consultar_auditoria: z.object({
    usuario: optionalString(),
    from: optionalString(),
    to: optionalString(),
    limit: optionalNumber(),
  }),
  // Comissões
  consultar_comissoes: z.object({
    vendedor: optionalString(),
    mesAno: optionalString(),
  }),
  registrar_entrada_estoque: z.object({
    produtoNome: optionalString(),
    produtoId: optionalNumber(),
    quantidade: requiredNumber(),
  }),
  atualizar_produto: z.object({
    id: requiredNumber(),
    custoPadrao: optionalNumber(),
    valorVenda: optionalNumber(),
    marca: optionalString(),
    categoria: optionalString(),
    qtdEstoque: optionalNumber(),
  }),
};

export const aiActions: AiActionDef[] = [
  {
    name: "listar_vendas",
    description: "Lista vendas filtrando por periodo, vendedor ou cliente. Use para 'compras do cliente X', 'vendas para fulano', 'quantas vezes comprou'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Data inicial YYYY-MM-DD" },
        to: { type: "string", description: "Data final YYYY-MM-DD" },
        vendedor: { type: "string", description: "Nome do vendedor" },
        clienteNome: { type: "string", description: "Nome ou parte do nome do cliente" },
        clienteId: { type: "number", description: "ID do cliente" },
        limit: { type: "number", description: "Limite de registros (padrão 50)" },
      },
    },
  },
  {
    name: "criar_venda",
    description: "Cria uma venda.",
    readOnly: false,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      required: ["dataVenda", "clienteId", "produtoNome", "valorVenda"],
      properties: {
        dataVenda: { type: "string", description: "YYYY-MM-DD" },
        vendedor: { type: "string" },
        clienteId: { type: "number" },
        produtoNome: { type: "string" },
        custoProduto: { type: "number" },
        valorVenda: { type: "number" },
        valorFrete: { type: "number" },
        custoEnvio: { type: "number" },
        parcelas: { type: "number" },
        antecipada: { type: "number" },
      },
    },
  },
  {
    name: "listar_clientes",
    description: "Lista clientes.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "criar_cliente",
    description: "Cria um cliente.",
    readOnly: false,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      required: ["nome"],
      properties: {
        nome: { type: "string" },
        tipo: { type: "string" },
        cpf: { type: "string" },
        cnpj: { type: "string" },
        renda: { type: "number" },
        empresa: { type: "string" },
        telefone: { type: "string" },
        cep: { type: "string" },
        endereco: { type: "string" },
        matricula: { type: "string" },
      },
    },
  },
  {
    name: "listar_produtos",
    description: "Lista produtos.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "criar_produto",
    description: "Cria um produto (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["nome"],
      properties: {
        nome: { type: "string" },
        marca: { type: "string" },
        ncm: { type: "string" },
        custoPadrao: { type: "number" },
        valorVenda: { type: "number" },
      },
    },
  },
  {
    name: "listar_despesas",
    description: "Lista despesas (admin).",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "criar_despesa",
    description: "Cria despesa (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["descricao", "valor", "dataDespesa"],
      properties: {
        descricao: { type: "string" },
        valor: { type: "number" },
        dataDespesa: { type: "string" },
        tipo: { type: "string" },
        categoria: { type: "string" },
      },
    },
  },
  {
    name: "listar_empresas",
    description: "Lista empresas parceiras (admin).",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "criar_empresa",
    description: "Cria empresa parceira (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["nome"],
      properties: {
        nome: { type: "string" },
        responsavelRh: { type: "string" },
        telefoneRh: { type: "string" },
        emailRh: { type: "string" },
      },
    },
  },
  {
    name: "listar_usuarios",
    description: "Lista usuarios (admin).",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "criar_usuario",
    description: "Cria usuario (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["username", "password", "role"],
      properties: {
        username: { type: "string" },
        password: { type: "string" },
        role: { type: "string" },
        nomeExibicao: { type: "string" },
      },
    },
  },
  {
    name: "atualizar_usuario",
    description: "Atualiza usuario (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        username: { type: "string" },
        password: { type: "string" },
        role: { type: "string" },
        nomeExibicao: { type: "string" },
        metaMensal: { type: "number" },
        comissaoPct: { type: "number" },
      },
    },
  },
  {
    name: "atualizar_venda",
    description: "Atualiza venda (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        dataVenda: { type: "string" },
        vendedor: { type: "string" },
        produtoNome: { type: "string" },
        valorVenda: { type: "number" },
        valorFrete: { type: "number" },
        custoEnvio: { type: "number" },
        parcelas: { type: "number" },
      },
    },
  },
  {
    name: "atualizar_despesa",
    description: "Atualiza despesa (admin).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        dataDespesa: { type: "string" },
        descricao: { type: "string" },
        valor: { type: "number" },
        tipo: { type: "string" },
      },
    },
  },
  {
    name: "gerar_catalogo_produtos",
    description: "Gera catalogo de produtos em PDF.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Filtro por nome do produto" },
      },
    },
  },
  {
    name: "consulta_sql",
    description: "Executa consulta SQL direta no banco (admin, apenas SELECT).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["sql"],
      properties: {
        sql: { type: "string", description: "Consulta SQL SELECT" },
      },
    },
  },
  {
    name: "consultar_parcelas_cliente",
    description:
      "Consulta parcelas de um cliente com status de pagamento, datas de vencimento e valores. Use para responder 'quanto deve', 'quando paga', 'parcelas em aberto', 'está em dia' etc.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Nome ou parte do nome do cliente" },
        clienteId: { type: "number", description: "ID do cliente (alternativa ao nome)" },
        apenasEmAberto: { type: "boolean", description: "true para listar apenas parcelas não pagas" },
        apenasVencidas: { type: "boolean", description: "true para listar apenas parcelas vencidas (não pagas e data passada)" },
      },
    },
  },
  {
    name: "listar_inadimplentes",
    description:
      "Lista todos os clientes com parcelas vencidas e não pagas, com total em aberto e dias de atraso. Use para 'quem está devendo', 'inadimplentes', 'clientes em atraso'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        diasMinimos: { type: "number", description: "Filtrar apenas clientes com atraso maior que N dias (padrão: 0)" },
      },
    },
  },
  // ── Financeiro ────────────────────────────────────────────────────────────
  {
    name: "resumo_financeiro",
    description:
      "Retorna DRE do mês: receita, CMV, comissões, despesas fixas/variáveis, lucro e ponto de equilíbrio. Use para 'lucro do mês', 'DRE', 'resultado financeiro', 'quanto faturamos'.",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        mesAno: { type: "string", description: "Mês no formato YYYY-MM (padrão: mês atual)" },
      },
    },
  },
  {
    name: "fluxo_caixa",
    description:
      "Retorna projeção de fluxo de caixa dos próximos 6 meses (entradas, saídas, saldo). Use para 'fluxo de caixa', 'projeção', 'entradas e saídas'.",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        mesAno: { type: "string", description: "Mês de referência YYYY-MM (padrão: mês atual)" },
      },
    },
  },
  // ── Fornecedores ──────────────────────────────────────────────────────────
  {
    name: "listar_fornecedores",
    description: "Lista fornecedores cadastrados.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Filtro por nome" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "criar_fornecedor",
    description: "Cria um fornecedor.",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["nome"],
      properties: {
        nome: { type: "string" },
        telefone: { type: "string" },
      },
    },
  },
  // ── Relatórios ────────────────────────────────────────────────────────────
  {
    name: "resumo_relatorio_vendas",
    description:
      "Retorna resumo de vendas por período com totais por vendedor e empresa. Use para 'relatório de vendas', 'total vendido por período', 'ranking de vendedores'.",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Data inicial YYYY-MM-DD" },
        to: { type: "string", description: "Data final YYYY-MM-DD" },
        vendedor: { type: "string" },
        empresa: { type: "string", description: "Empresa conveniada do cliente" },
      },
    },
  },
  {
    name: "resumo_margem_produto",
    description:
      "Retorna margem de lucro por produto (receita, custo, margem%). Use para 'produto mais lucrativo', 'margem por produto', 'análise de margens'.",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Top N produtos (padrão: 20)" },
      },
    },
  },
  // ── Assinatura digital ────────────────────────────────────────────────────
  {
    name: "consultar_assinaturas_pendentes",
    description:
      "Lista vendas que aguardam assinatura do cliente (descontoEmFolha pendente). Use para 'assinaturas pendentes', 'autorizações não assinadas', 'quem ainda não assinou'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        vendedor: { type: "string", description: "Filtrar por vendedor" },
        limit: { type: "number" },
      },
    },
  },
  // ── Boletos ───────────────────────────────────────────────────────────────
  {
    name: "listar_boletos",
    description:
      "Lista vendas com boleto: gerado, pendente de geração ou por cliente. Use para 'boletos', 'quem tem boleto', 'boleto pendente'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Filtrar por nome do cliente" },
        status: { type: "string", description: "'gerado' | 'pendente' (sem boletoUrl ainda)" },
        limit: { type: "number" },
      },
    },
  },
  // ── Auditoria ─────────────────────────────────────────────────────────────
  {
    name: "consultar_auditoria",
    description:
      "Consulta log de auditoria do sistema (ações da IA e do sistema). Use para 'o que foi feito', 'histórico de ações', 'log do sistema'.",
    readOnly: true,
    roles: ["admin"],
    parameters: {
      type: "object",
      properties: {
        usuario: { type: "string", description: "Filtrar por usuário" },
        from: { type: "string", description: "Data inicial YYYY-MM-DD" },
        to: { type: "string", description: "Data final YYYY-MM-DD" },
        limit: { type: "number" },
      },
    },
  },
  // ── Comissões ─────────────────────────────────────────────────────────────
  {
    name: "consultar_comissoes",
    description:
      "Consulta comissões por vendedor no mês: total vendido, % comissão, valor a receber, meta e % atingida. Use para 'minha comissão', 'quanto vou receber', 'meta do mês'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        vendedor: { type: "string", description: "Nome do vendedor (padrão: usuário atual)" },
        mesAno: { type: "string", description: "YYYY-MM (padrão: mês atual)" },
      },
    },
  },
  {
    name: "consultar_limite_cliente",
    description:
      "Consulta o limite de crédito disponível de um cliente (margem consignável, comprometimento atual). Use para 'qual o limite', 'pode comprar mais', 'quanto tem disponível'.",
    readOnly: true,
    roles: ["admin", "vendedor"],
    parameters: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Nome ou parte do nome do cliente" },
        clienteId: { type: "number", description: "ID do cliente" },
      },
    },
  },
  {
    name: "registrar_entrada_estoque",
    description:
      "Registra entrada de produtos no estoque (adiciona quantidade). Use para 'entrada de produto', 'chegou mercadoria', 'adicionar estoque'. Requer produtoNome ou produtoId e quantidade.",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["quantidade"],
      properties: {
        produtoNome: { type: "string", description: "Nome ou parte do nome do produto" },
        produtoId: { type: "number", description: "ID do produto" },
        quantidade: { type: "number", description: "Quantidade a adicionar ao estoque" },
      },
    },
  },
  {
    name: "atualizar_produto",
    description:
      "Atualiza dados de um produto existente (custo, preço de venda, marca, categoria, estoque).",
    readOnly: false,
    roles: ["admin"],
    parameters: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number", description: "ID do produto" },
        custoPadrao: { type: "number" },
        valorVenda: { type: "number" },
        marca: { type: "string" },
        categoria: { type: "string" },
        qtdEstoque: { type: "number", description: "Quantidade absoluta em estoque" },
      },
    },
  },
];

function requireAdmin(ctx: ActionContext) {
  if (ctx.role != "admin") {
    throw new Error("Acao permitida apenas para administradores.");
  }
}

function sanitizeSql(raw: string) {
  const sql = raw.trim();
  if (!/^select\s+/i.test(sql)) {
    throw new Error("Apenas consultas SELECT sao permitidas.");
  }
  if (/[;]/.test(sql)) {
    throw new Error("Nao use ponto e virgula.");
  }
  if (/\b(update|delete|insert|drop|alter|truncate|create|grant|revoke)\b/i.test(sql)) {
    throw new Error("Comando SQL nao permitido.");
  }
  if (/\blimit\b/i.test(sql)) return sql;
  return `${sql} LIMIT 200`;
}

export async function executeAiAction(name: string, params: any, ctx: ActionContext) {
  const logAction = async (status: "success" | "error", details: unknown) => {
    await prisma.auditLog.create({
      data: {
        dataHora: new Date(),
        usuario: ctx.username,
        acao: `ai:${name}:${status}`,
        detalhes: JSON.stringify(details ?? {}),
      },
    });
  };

  try {
    const def = aiActions.find((action) => action.name === name);
    if (!def) {
      throw new Error("Acao nao suportada.");
    }
    const schema = actionParamSchemas[name];
    const parsedParams = schema ? schema.parse(params ?? {}) : (params ?? {});
    let result: unknown;
    switch (name) {
      case "listar_vendas": {
        const from = parsedParams?.from ? new Date(parsedParams.from) : undefined;
        const to = parsedParams?.to ? new Date(parsedParams.to) : undefined;
        const vendedor = ctx.role === "admin" ? parsedParams?.vendedor : ctx.displayName;

        // Resolver clienteId por nome se necessário
        let clienteId: number | undefined = parsedParams?.clienteId ? Number(parsedParams.clienteId) : undefined;
        let clienteNomeResolvido: string | undefined;
        if (!clienteId && parsedParams?.clienteNome) {
          const cl = await fuzzyFindClienteByNome(parsedParams.clienteNome);
          if (!cl) { result = { erro: `Cliente '${parsedParams.clienteNome}' não encontrado.` }; break; }
          clienteId = cl.id;
          clienteNomeResolvido = cl.nome;
        }

        const vendas = await prisma.venda.findMany({
          where: {
            dataVenda: from && to ? { gte: from, lte: to } : undefined,
            vendedor: vendedor ? { equals: vendedor } : undefined,
            clienteId: clienteId ?? undefined,
          },
          include: { cliente: { select: { nome: true } } },
          orderBy: { dataVenda: "desc" },
          take: Math.min(Number(parsedParams?.limit || 50), 200),
        });

        result = {
          total: vendas.length,
          cliente: clienteNomeResolvido,
          vendas: vendas.map(v => ({
            id: v.id,
            dataVenda: v.dataVenda.toISOString().split("T")[0],
            cliente: v.cliente?.nome,
            produto: v.produtoNome,
            vendedor: v.vendedor,
            valorTotal: valorTotalVenda(v),
            parcelas: v.parcelas,
          })),
        };
        break;
      }
      case "criar_venda": {
        const vendedor = ctx.role === "admin" ? parsedParams?.vendedor : ctx.displayName;
        result = await prisma.venda.create({
          data: {
            uuid: uuidv7(),
            dataVenda: new Date(parsedParams.dataVenda),
            vendedor,
            clienteId: Number(parsedParams.clienteId),
            produtoNome: parsedParams.produtoNome,
            custoProduto: parsedParams.custoProduto || 0,
            valorVenda: parsedParams.valorVenda || 0,
            valorFrete: parsedParams.valorFrete || 0,
            custoEnvio: parsedParams.custoEnvio || 0,
            parcelas: parsedParams.parcelas || 1,
            valorParcela: Math.trunc(((parsedParams.valorVenda || 0) / (parsedParams.parcelas || 1)) * 100) / 100,
            antecipada: parsedParams.antecipada ?? 0,
          },
        });
        break;
      }
      case "listar_clientes": {
        const limit = Math.min(Number(parsedParams?.limit || 50), 200);
        result = parsedParams?.search
          ? await fuzzyFindClientes(parsedParams.search, limit)
          : await prisma.cliente.findMany({ take: limit, orderBy: { nome: "asc" } });
        break;
      }
      case "criar_cliente":
        result = await prisma.cliente.create({ data: parsedParams });
        break;
      case "listar_produtos": {
        const limit = Math.min(Number(parsedParams?.limit || 50), 200);
        result = parsedParams?.search
          ? await fuzzyFindProdutos(parsedParams.search, limit)
          : await prisma.produto.findMany({ take: limit, orderBy: { nome: "asc" } });
        break;
      }
      case "criar_produto":
        requireAdmin(ctx);
        result = await prisma.produto.create({ data: parsedParams });
        break;
      case "listar_despesas":
        requireAdmin(ctx);
        result = await prisma.despesa.findMany({
          where:
            parsedParams?.from && parsedParams?.to
              ? {
                  dataDespesa: {
                    gte: new Date(parsedParams.from),
                    lte: new Date(parsedParams.to),
                  },
                }
              : undefined,
          orderBy: { dataDespesa: "desc" },
          take: Math.min(Number(parsedParams?.limit || 50), 200),
        });
        break;
      case "criar_despesa":
        requireAdmin(ctx);
        result = await prisma.despesa.create({
          data: {
            descricao: parsedParams.descricao,
            valor: parsedParams.valor,
            dataDespesa: new Date(parsedParams.dataDespesa),
            tipo: parsedParams.tipo,
            categoria: parsedParams.categoria,
          },
        });
        break;
      case "listar_empresas":
        requireAdmin(ctx);
        result = await prisma.empresaParceira.findMany({
          take: Math.min(Number(parsedParams?.limit || 50), 200),
          orderBy: { nome: "asc" },
        });
        break;
      case "criar_empresa":
        requireAdmin(ctx);
        result = await prisma.empresaParceira.create({ data: parsedParams });
        break;
      case "listar_usuarios":
        requireAdmin(ctx);
        result = await prisma.usuario.findMany({
          take: Math.min(Number(parsedParams?.limit || 50), 200),
          orderBy: { nomeExibicao: "asc" },
        });
        break;
      case "criar_usuario":
        requireAdmin(ctx);
        result = await prisma.usuario.create({ data: parsedParams });
        break;
      case "atualizar_usuario":
        requireAdmin(ctx);
        result = await prisma.usuario.update({
          where: { id: Number(parsedParams.id) },
          data: parsedParams,
        });
        break;
      case "atualizar_venda":
        requireAdmin(ctx);
        result = await prisma.venda.update({
          where: { id: Number(parsedParams.id) },
          data: {
            dataVenda: parsedParams.dataVenda ? new Date(parsedParams.dataVenda) : undefined,
            vendedor: parsedParams.vendedor ?? undefined,
            produtoNome: parsedParams.produtoNome ?? undefined,
            valorVenda: parsedParams.valorVenda ?? undefined,
            valorFrete: parsedParams.valorFrete ?? undefined,
            custoEnvio: parsedParams.custoEnvio ?? undefined,
            parcelas: parsedParams.parcelas ?? undefined,
          },
        });
        break;
      case "atualizar_despesa":
        requireAdmin(ctx);
        result = await prisma.despesa.update({
          where: { id: Number(parsedParams.id) },
          data: {
            dataDespesa: parsedParams.dataDespesa ? new Date(parsedParams.dataDespesa) : undefined,
            descricao: parsedParams.descricao ?? undefined,
            valor: parsedParams.valor ?? undefined,
            tipo: parsedParams.tipo ?? undefined,
          },
        });
        break;
      case "gerar_catalogo_produtos": {
        const count = await prisma.produto.count({
          where: parsedParams?.search
            ? { nome: { contains: parsedParams.search, mode: "insensitive" } }
            : undefined,
        });
        result = { total: count, search: parsedParams?.search ?? "" };
        break;
      }
      case "consulta_sql": {
        requireAdmin(ctx);
        const sql = sanitizeSql(String(parsedParams?.sql || ""));
        const rows = await prisma.$queryRawUnsafe(sql);
        const list = Array.isArray(rows) ? rows : [rows];
        result = { rows: list, count: list.length, sql };
        break;
      }
      case "consultar_parcelas_cliente": {
        // Resolver cliente por nome ou id
        let clienteId: number | undefined = parsedParams?.clienteId ? Number(parsedParams.clienteId) : undefined;
        let clienteNome: string | undefined;
        if (!clienteId && parsedParams?.clienteNome) {
          const cliente = await fuzzyFindClienteByNome(parsedParams.clienteNome);
          if (!cliente) { result = { erro: `Cliente '${parsedParams.clienteNome}' não encontrado.` }; break; }
          clienteId = cliente.id;
          clienteNome = cliente.nome;
        } else if (clienteId) {
          const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { nome: true } });
          clienteNome = cliente?.nome;
        }
        if (!clienteId) { result = { erro: "Informe clienteNome ou clienteId." }; break; }

        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const parcelas = await prisma.parcelaVencimento.findMany({
          where: {
            venda: { clienteId },
            ...(parsedParams?.apenasEmAberto ? { paga: false } : {}),
            ...(parsedParams?.apenasVencidas ? { paga: false, dataVencimento: { lt: hoje } } : {}),
          },
          include: { venda: { select: { id: true, produtoNome: true, parcelas: true } } },
          orderBy: { dataVencimento: "asc" },
        });

        const totalEmAberto = parcelas.filter(p => !p.paga).reduce((s, p) => s + p.valorParcela, 0);
        const totalVencido = parcelas.filter(p => !p.paga && p.dataVencimento < hoje).reduce((s, p) => s + p.valorParcela, 0);
        result = {
          cliente: clienteNome,
          totalEmAberto: Math.trunc(totalEmAberto * 100) / 100,
          totalVencido: Math.trunc(totalVencido * 100) / 100,
          parcelas: parcelas.map(p => ({
            vendaId: p.venda.id,
            produto: p.venda.produtoNome,
            numeroParcela: `${p.numeroParcela}/${p.venda.parcelas}`,
            dataVencimento: p.dataVencimento.toISOString().split("T")[0],
            valor: Math.trunc(p.valorParcela * 100) / 100,
            paga: p.paga,
            dataPagamento: p.dataPagamento?.toISOString().split("T")[0] ?? null,
            diasAtraso: !p.paga && p.dataVencimento < hoje
              ? Math.floor((hoje.getTime() - p.dataVencimento.getTime()) / 86400000)
              : 0,
          })),
        };
        break;
      }
      case "listar_inadimplentes": {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const diasMinimos = Number(parsedParams?.diasMinimos ?? 0);
        const limite = new Date(hoje.getTime() - diasMinimos * 86400000);

        const parcelasVencidas = await prisma.parcelaVencimento.findMany({
          where: { paga: false, dataVencimento: { lt: limite } },
          include: { venda: { include: { cliente: { select: { id: true, nome: true, telefone: true } } } } },
          orderBy: { dataVencimento: "asc" },
        });

        // Agrupar por cliente
        const porCliente = new Map<number, { nome: string; telefone: string | null; totalDevido: number; maiorAtraso: number; parcelas: number }>();
        for (const p of parcelasVencidas) {
          const c = p.venda.cliente;
          if (!c) continue;
          const dias = Math.floor((hoje.getTime() - p.dataVencimento.getTime()) / 86400000);
          const atual = porCliente.get(c.id) ?? { nome: c.nome, telefone: c.telefone, totalDevido: 0, maiorAtraso: 0, parcelas: 0 };
          atual.totalDevido += p.valorParcela;
          atual.maiorAtraso = Math.max(atual.maiorAtraso, dias);
          atual.parcelas += 1;
          porCliente.set(c.id, atual);
        }

        result = {
          total: porCliente.size,
          inadimplentes: Array.from(porCliente.values())
            .sort((a, b) => b.totalDevido - a.totalDevido)
            .map(c => ({ ...c, totalDevido: Math.trunc(c.totalDevido * 100) / 100 })),
        };
        break;
      }
      case "consultar_limite_cliente": {
        let clienteId: number | undefined = parsedParams?.clienteId ? Number(parsedParams.clienteId) : undefined;
        if (!clienteId && parsedParams?.clienteNome) {
          const cliente = await fuzzyFindClienteByNome(parsedParams.clienteNome);
          if (!cliente) { result = { erro: `Cliente '${parsedParams.clienteNome}' não encontrado.` }; break; }
          clienteId = cliente.id;
        }
        if (!clienteId) { result = { erro: "Informe clienteNome ou clienteId." }; break; }

        const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
        if (!cliente) { result = { erro: "Cliente não encontrado." }; break; }

        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        // Parcelas em aberto (comprometimento atual)
        const parcelasEmAberto = await prisma.parcelaVencimento.findMany({
          where: { venda: { clienteId }, paga: false, dataVencimento: { gte: hoje } },
          select: { valorParcela: true, dataVencimento: true },
          orderBy: { dataVencimento: "asc" },
        });

        // Comprometimento = maior valor de parcela mensal em aberto
        const porMes = new Map<string, number>();
        for (const p of parcelasEmAberto) {
          const mes = p.dataVencimento.toISOString().slice(0, 7);
          porMes.set(mes, (porMes.get(mes) ?? 0) + p.valorParcela);
        }
        const comprometimentoAtual = Math.max(...(porMes.size ? Array.from(porMes.values()) : [0]));
        const margem = (cliente.renda ?? 0) * 0.35; // 35% da renda
        const disponivel = Math.max(0, margem - comprometimentoAtual);

        result = {
          cliente: cliente.nome,
          renda: cliente.renda ?? null,
          margemConsignavel: Math.trunc(margem * 100) / 100,
          comprometimentoMensalAtual: Math.trunc(comprometimentoAtual * 100) / 100,
          limiteDisponivel: Math.trunc(disponivel * 100) / 100,
          parcelasEmAberto: parcelasEmAberto.length,
        };
        break;
      }
      case "resumo_financeiro": {
        requireAdmin(ctx);
        const mesAno = parsedParams?.mesAno ?? new Date().toISOString().slice(0, 7);
        const dre = await calcularDre(mesAno);
        result = { mesAno, ...dre };
        break;
      }
      case "fluxo_caixa": {
        requireAdmin(ctx);
        const mesAno = parsedParams?.mesAno;
        result = await calcularFluxoCaixa(mesAno);
        break;
      }
      case "listar_fornecedores": {
        const limit = Math.min(Number(parsedParams?.limit || 50), 200);
        result = parsedParams?.search
          ? await fuzzyFindFornecedores(parsedParams.search, limit)
          : await prisma.fornecedor.findMany({ take: limit, orderBy: { nome: "asc" } });
        break;
      }
      case "criar_fornecedor":
        requireAdmin(ctx);
        result = await prisma.fornecedor.create({
          data: { nome: parsedParams.nome, telefone: parsedParams.telefone ?? null },
        });
        break;
      case "resumo_relatorio_vendas": {
        requireAdmin(ctx);
        const from = parsedParams?.from ? new Date(parsedParams.from) : undefined;
        const to = parsedParams?.to ? new Date(parsedParams.to) : undefined;
        const vendas = await prisma.venda.findMany({
          where: {
            dataVenda: from && to ? { gte: from, lte: to } : undefined,
            vendedor: parsedParams?.vendedor ? { equals: parsedParams.vendedor } : undefined,
          },
          include: { cliente: { select: { nome: true, empresa: true } } },
          orderBy: { dataVenda: "desc" },
        });
        const totalVendas = vendas.reduce((s, v) => s + valorTotalVenda(v), 0);
        const totalCusto = vendas.reduce((s, v) => s + (v.custoProduto || 0) + (v.custoEnvio || 0), 0);
        const porVendedor: Record<string, number> = {};
        const porEmpresa: Record<string, number> = {};
        for (const v of vendas) {
          const vend = v.vendedor || "Sem Vendedor";
          porVendedor[vend] = (porVendedor[vend] ?? 0) + valorTotalVenda(v);
          const emp = v.cliente?.empresa || "Sem Empresa";
          if (parsedParams?.empresa && emp !== parsedParams.empresa) continue;
          porEmpresa[emp] = (porEmpresa[emp] ?? 0) + valorTotalVenda(v);
        }
        result = {
          periodo: { from: parsedParams?.from, to: parsedParams?.to },
          totalVendas: Math.trunc(totalVendas * 100) / 100,
          totalCusto: Math.trunc(totalCusto * 100) / 100,
          lucroTotal: Math.trunc((totalVendas - totalCusto) * 100) / 100,
          quantidadeVendas: vendas.length,
          porVendedor: Object.entries(porVendedor)
            .sort((a, b) => b[1] - a[1])
            .map(([nome, total]) => ({ nome, total: Math.trunc(total * 100) / 100 })),
          porEmpresa: Object.entries(porEmpresa)
            .sort((a, b) => b[1] - a[1])
            .map(([nome, total]) => ({ nome, total: Math.trunc(total * 100) / 100 })),
        };
        break;
      }
      case "resumo_margem_produto": {
        requireAdmin(ctx);
        const limit = Math.min(Number(parsedParams?.limit || 20), 100);
        const vendas = await prisma.venda.findMany({
          select: { produtoNome: true, valorVenda: true, valorFrete: true, custoProduto: true, custoEnvio: true },
        });
        const porProduto = new Map<string, { receita: number; custo: number; qtd: number }>();
        for (const v of vendas) {
          const nome = v.produtoNome || "Sem Nome";
          const rec = (v.valorVenda || 0) + (v.valorFrete || 0);
          const cus = (v.custoProduto || 0) + (v.custoEnvio || 0);
          const atual = porProduto.get(nome) ?? { receita: 0, custo: 0, qtd: 0 };
          porProduto.set(nome, { receita: atual.receita + rec, custo: atual.custo + cus, qtd: atual.qtd + 1 });
        }
        result = Array.from(porProduto.entries())
          .map(([nome, d]) => ({
            nome,
            receita: Math.trunc(d.receita * 100) / 100,
            custo: Math.trunc(d.custo * 100) / 100,
            lucro: Math.trunc((d.receita - d.custo) * 100) / 100,
            margemPct: d.receita > 0 ? Math.trunc(((d.receita - d.custo) / d.receita) * 10000) / 100 : 0,
            qtdVendas: d.qtd,
          }))
          .sort((a, b) => b.lucro - a.lucro)
          .slice(0, limit);
        break;
      }
      case "consultar_assinaturas_pendentes": {
        const whereVendedor = ctx.role === "admin" ? parsedParams?.vendedor : ctx.displayName;
        const pendentes = await prisma.venda.findMany({
          where: {
            descontoEmFolha: true,
            assinaturaStatus: "pendente",
            vendedor: whereVendedor ? { equals: whereVendedor } : undefined,
          },
          include: { cliente: { select: { nome: true, telefone: true } } },
          orderBy: { dataVenda: "desc" },
          take: Math.min(Number(parsedParams?.limit || 50), 200),
        });
        result = {
          total: pendentes.length,
          vendas: pendentes.map(v => ({
            id: v.id,
            dataVenda: v.dataVenda.toISOString().split("T")[0],
            vendedor: v.vendedor,
            cliente: v.cliente?.nome,
            telefone: v.cliente?.telefone,
            produto: v.produtoNome,
            valor: valorTotalVenda(v),
            assinaturaToken: v.assinaturaToken,
          })),
        };
        break;
      }
      case "listar_boletos": {
        const isGerado = parsedParams?.status === "gerado";
        const isPendente = parsedParams?.status === "pendente";
        const vendedorFilter = ctx.role === "admin" ? undefined : ctx.displayName;
        const clienteIdFilter = parsedParams?.clienteNome
          ? (await fuzzyFindClienteByNome(parsedParams.clienteNome))?.id
          : undefined;
        const boletos = await prisma.venda.findMany({
          where: {
            boleto: true,
            vendedor: vendedorFilter ? { equals: vendedorFilter } : undefined,
            clienteId: clienteIdFilter ?? undefined,
            boletoUrl: isGerado ? { not: null } : isPendente ? null : undefined,
          },
          include: { cliente: { select: { nome: true } } },
          orderBy: { dataVenda: "desc" },
          take: Math.min(Number(parsedParams?.limit || 50), 200),
        });
        result = {
          total: boletos.length,
          boletos: boletos.map(v => ({
            id: v.id,
            dataVenda: v.dataVenda.toISOString().split("T")[0],
            cliente: v.cliente?.nome,
            produto: v.produtoNome,
            valor: valorTotalVenda(v),
            parcelas: v.parcelas,
            boletoGerado: !!v.boletoUrl,
            boletoUrl: v.boletoUrl ?? null,
          })),
        };
        break;
      }
      case "consultar_auditoria": {
        requireAdmin(ctx);
        const from = parsedParams?.from ? new Date(parsedParams.from) : undefined;
        const to = parsedParams?.to ? new Date(parsedParams.to) : undefined;
        const logs = await prisma.auditLog.findMany({
          where: {
            usuario: parsedParams?.usuario ? { contains: parsedParams.usuario, mode: "insensitive" } : undefined,
            dataHora: from && to ? { gte: from, lte: to } : undefined,
          },
          orderBy: { dataHora: "desc" },
          take: Math.min(Number(parsedParams?.limit || 50), 200),
        });
        result = {
          total: logs.length,
          logs: logs.map(l => ({
            id: l.id,
            dataHora: l.dataHora.toISOString(),
            usuario: l.usuario,
            acao: l.acao,
            detalhes: l.detalhes ? JSON.parse(l.detalhes) : null,
          })),
        };
        break;
      }
      case "consultar_comissoes": {
        const mesAno = parsedParams?.mesAno ?? new Date().toISOString().slice(0, 7);
        const [ano, mes] = mesAno.split("-").map(Number);
        const ini = new Date(Date.UTC(ano, mes - 1, 1));
        const fim = new Date(Date.UTC(ano, mes, 1));
        const vendedorFiltro = ctx.role === "admin" ? parsedParams?.vendedor : ctx.displayName;

        const vendas = await prisma.venda.findMany({
          where: {
            dataVenda: { gte: ini, lt: fim },
            vendedor: vendedorFiltro ? { equals: vendedorFiltro } : undefined,
          },
          select: { vendedor: true, valorVenda: true, valorFrete: true },
        });
        const usuarios = await prisma.usuario.findMany({ select: { nomeExibicao: true, comissaoPct: true, metaMensal: true } });
        const porVendedor = new Map<string, number>();
        for (const v of vendas) {
          const nome = v.vendedor || "Sem Vendedor";
          porVendedor.set(nome, (porVendedor.get(nome) ?? 0) + valorTotalVenda(v));
        }
        result = {
          mesAno,
          comissoes: Array.from(porVendedor.entries()).map(([nome, totalVendido]) => {
            const u = usuarios.find(x => x.nomeExibicao === nome);
            const pct = u?.comissaoPct ?? 2;
            const meta = u?.metaMensal ?? 0;
            const comissao = Math.trunc(totalVendido * (pct / 100) * 100) / 100;
            return {
              vendedor: nome,
              totalVendido: Math.trunc(totalVendido * 100) / 100,
              comissaoPct: pct,
              comissaoValor: comissao,
              meta,
              metaAtingidaPct: meta > 0 ? Math.trunc((totalVendido / meta) * 10000) / 100 : null,
            };
          }).sort((a, b) => b.totalVendido - a.totalVendido),
        };
        break;
      }
      case "registrar_entrada_estoque": {
        requireAdmin(ctx);
        if (!parsedParams?.produtoNome && !parsedParams?.produtoId) {
          result = { error: "Informe o nome ou ID do produto." };
          break;
        }
        const produto = parsedParams.produtoId
          ? await prisma.produto.findFirst({ where: { id: parsedParams.produtoId } })
          : await fuzzyFindProdutoByNome(parsedParams.produtoNome!);
        if (!produto) {
          result = { error: `Produto não encontrado: ${parsedParams.produtoNome ?? parsedParams.produtoId}` };
          break;
        }
        const updated = await prisma.produto.update({
          where: { id: produto.id },
          data: { qtdEstoque: { increment: parsedParams.quantidade } },
        });
        result = { ok: true, produto: updated.nome, qtdEstoqueAnterior: produto.qtdEstoque ?? 0, qtdEstoqueNova: updated.qtdEstoque };
        break;
      }
      case "atualizar_produto": {
        requireAdmin(ctx);
        const { id, ...data } = parsedParams;
        const hasUpdate = Object.values(data).some((v) => v !== undefined);
        if (!hasUpdate) {
          result = { error: "Nenhum campo para atualizar foi informado." };
          break;
        }
        const updatedProduto = await prisma.produto.update({
          where: { id },
          data: {
            ...(data.custoPadrao !== undefined && { custoPadrao: data.custoPadrao }),
            ...(data.valorVenda !== undefined && { valorVenda: data.valorVenda }),
            ...(data.marca !== undefined && { marca: data.marca }),
            ...(data.categoria !== undefined && { categoria: data.categoria }),
            ...(data.qtdEstoque !== undefined && { qtdEstoque: data.qtdEstoque }),
          },
        });
        result = {
          ok: true,
          produto: updatedProduto.nome,
          id: updatedProduto.id,
          qtdEstoque: updatedProduto.qtdEstoque,
          valorVenda: updatedProduto.valorVenda,
          custoPadrao: updatedProduto.custoPadrao,
        };
        break;
      }
      default:
        throw new Error("Acao nao suportada.");
    }

    await logAction("success", { params: parsedParams, result });
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await logAction("error", { params, error: msg });

    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      const fields = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(", ") : String(error.meta?.target ?? "campo");
      return { error: `Já existe um registro com o mesmo valor em: ${fields}. Verifique os dados e tente com um valor diferente.` };
    }

    if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Registro não encontrado para atualizar ou excluir." };
    }

    throw error;
  }
}
