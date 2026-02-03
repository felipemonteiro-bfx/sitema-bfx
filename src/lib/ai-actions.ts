import { prisma } from "@/lib/db";

export type ActionContext = {
  role: "admin" | "vendedor";
  username: string;
  displayName: string;
};

export const aiActions = [
  {
    name: "listar_vendas",
    description: "Lista vendas filtrando por período e vendedor.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Data inicial YYYY-MM-DD" },
        to: { type: "string", description: "Data final YYYY-MM-DD" },
        vendedor: { type: "string", description: "Nome do vendedor" },
        limit: { type: "number", description: "Limite de registros" },
      },
    },
  },
  {
    name: "criar_venda",
    description: "Cria uma venda.",
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
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "criar_empresa",
    description: "Cria empresa parceira (admin).",
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
    description: "Lista usuários (admin).",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "criar_usuario",
    description: "Cria usuário (admin).",
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
    description: "Atualiza usuário (admin).",
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
] as const;

function requireAdmin(ctx: ActionContext) {
  if (ctx.role !== "admin") {
    throw new Error("Ação permitida apenas para administradores.");
  }
}

export async function executeAiAction(name: string, params: any, ctx: ActionContext) {
  switch (name) {
    case "listar_vendas": {
      const from = params?.from ? new Date(params.from) : undefined;
      const to = params?.to ? new Date(params.to) : undefined;
      const vendedor = ctx.role === "admin" ? params?.vendedor : ctx.displayName;
      return prisma.venda.findMany({
        where: {
          dataVenda: from && to ? { gte: from, lte: to } : undefined,
          vendedor: vendedor ? { equals: vendedor } : undefined,
        },
        orderBy: { dataVenda: "desc" },
        take: Math.min(Number(params?.limit || 20), 100),
      });
    }
    case "criar_venda": {
      const vendedor = ctx.role === "admin" ? params?.vendedor : ctx.displayName;
      return prisma.venda.create({
        data: {
          dataVenda: new Date(params.dataVenda),
          vendedor,
          clienteId: Number(params.clienteId),
          produtoNome: params.produtoNome,
          custoProduto: params.custoProduto || 0,
          valorVenda: params.valorVenda || 0,
          valorFrete: params.valorFrete || 0,
          custoEnvio: params.custoEnvio || 0,
          parcelas: params.parcelas || 1,
          valorParcela:
            (params.valorVenda || 0) / (params.parcelas || 1),
          antecipada: params.antecipada ?? 1,
        },
      });
    }
    case "listar_clientes":
      return prisma.cliente.findMany({
        where: params?.search ? { nome: { contains: params.search, mode: "insensitive" } } : undefined,
        take: Math.min(Number(params?.limit || 50), 200),
        orderBy: { nome: "asc" },
      });
    case "criar_cliente":
      return prisma.cliente.create({ data: params });
    case "listar_produtos":
      return prisma.produto.findMany({
        where: params?.search ? { nome: { contains: params.search, mode: "insensitive" } } : undefined,
        take: Math.min(Number(params?.limit || 50), 200),
        orderBy: { nome: "asc" },
      });
    case "criar_produto":
      requireAdmin(ctx);
      return prisma.produto.create({ data: params });
    case "listar_despesas":
      requireAdmin(ctx);
      return prisma.despesa.findMany({
        where:
          params?.from && params?.to
            ? { dataDespesa: { gte: new Date(params.from), lte: new Date(params.to) } }
            : undefined,
        orderBy: { dataDespesa: "desc" },
        take: Math.min(Number(params?.limit || 50), 200),
      });
    case "criar_despesa":
      requireAdmin(ctx);
      return prisma.despesa.create({
        data: {
          descricao: params.descricao,
          valor: params.valor,
          dataDespesa: new Date(params.dataDespesa),
          tipo: params.tipo,
          categoria: params.categoria,
        },
      });
    case "listar_empresas":
      requireAdmin(ctx);
      return prisma.empresaParceira.findMany({
        take: Math.min(Number(params?.limit || 50), 200),
        orderBy: { nome: "asc" },
      });
    case "criar_empresa":
      requireAdmin(ctx);
      return prisma.empresaParceira.create({ data: params });
    case "listar_usuarios":
      requireAdmin(ctx);
      return prisma.usuario.findMany({
        take: Math.min(Number(params?.limit || 50), 200),
        orderBy: { nomeExibicao: "asc" },
      });
    case "criar_usuario":
      requireAdmin(ctx);
      return prisma.usuario.create({ data: params });
    case "atualizar_usuario":
      requireAdmin(ctx);
      return prisma.usuario.update({
        where: { id: Number(params.id) },
        data: params,
      });
    case "atualizar_venda":
      requireAdmin(ctx);
      return prisma.venda.update({
        where: { id: Number(params.id) },
        data: {
          dataVenda: params.dataVenda ? new Date(params.dataVenda) : undefined,
          vendedor: params.vendedor,
          produtoNome: params.produtoNome,
          valorVenda: params.valorVenda,
          valorFrete: params.valorFrete,
          custoEnvio: params.custoEnvio,
          parcelas: params.parcelas,
        },
      });
    case "atualizar_despesa":
      requireAdmin(ctx);
      return prisma.despesa.update({
        where: { id: Number(params.id) },
        data: {
          dataDespesa: params.dataDespesa ? new Date(params.dataDespesa) : undefined,
          descricao: params.descricao,
          valor: params.valor,
          tipo: params.tipo,
        },
      });
    default:
      throw new Error("Ação não suportada.");
  }
}
