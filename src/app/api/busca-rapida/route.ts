/**
 * Busca global (⌘K). GET /api/busca-rapida?q=...
 *
 * Contrato de resposta (200):
 *   {
 *     sugestao: { titulo: string; url: string } | null,
 *     vendas:   { id; cliente; data ("AAAA-MM-DD"); valor; statusAssinatura ("assinado"|"pendente"|null) }[]  // até 5
 *     clientes: { id; nome }[]                                                                              // até 5
 *     totalVendas: number
 *   }
 *
 * Segurança: sessão obrigatória; para quem não é admin tudo é travado no próprio
 * vendedor (vendas e clientes), mesmo que o texto cite outra pessoa. A resposta
 * é montada campo a campo — nunca custo, lucro, CPF, telefone ou e-mail.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveVendedorScope, whereVendasDoUsuario } from "@/lib/vendedor-scope";
import { whereAssinaturaPendente } from "@/lib/historico-filtros";
import { fuzzyFindVendas, unaccentFindClienteIds } from "@/lib/db-search";
import { valorTotalVenda } from "@/lib/venda-utils";
import { interpretarConsulta, rotuloSugestao, statusAssinaturaDe } from "@/lib/busca-rapida";

const MAX_Q = 80;
const MAX_ITENS = 5;
// Quantos ids a busca fuzzy olha antes do corte final (o total mostrado vem da contagem).
const LIMITE_IDS = 200;

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length > MAX_Q) {
    return NextResponse.json({ error: `Busca longa demais (máx. ${MAX_Q} caracteres).` }, { status: 400 });
  }
  const vazio = { sugestao: null, vendas: [], clientes: [], totalVendas: 0 };
  if (!q) return NextResponse.json(vazio, { headers: SEM_CACHE });

  // Não-admin: o parâmetro é ignorado e o escopo é o próprio vendedor.
  const ehAdmin = session.role === "admin";
  const escopo = ehAdmin ? undefined : resolveVendedorScope(undefined, session);

  const usuarios = await prisma.usuario.findMany({ select: { username: true, nomeExibicao: true } });
  const nomes = usuarios.map((u) => String(u.nomeExibicao || u.username));
  const consulta = interpretarConsulta(q, nomes, escopo);

  const temFiltro = Boolean(consulta.vendedor || consulta.assinatura || consulta.forma);
  if (!consulta.idVenda && !consulta.termo && !temFiltro) {
    return NextResponse.json(vazio, { headers: SEM_CACHE });
  }

  // Busca por texto: os ids vêm da busca fuzzy já travada no escopo.
  let idsTexto: number[] | undefined;
  if (!consulta.idVenda && consulta.termo) {
    const achadas = await fuzzyFindVendas(consulta.termo, LIMITE_IDS, ehAdmin ? undefined : { id: session.id, nome: escopo as string });
    idsTexto = achadas.map((v) => v.id);
  }

  // Escopo do usuário: o MESMO filtro vale para a lista, o total (`count`) e a busca por #id,
  // para o total nunca revelar vendas que a lista esconde. Não-admin ignora o vendedor citado
  // no texto (o escopo já é o dele); só admin filtra pelo nome citado.
  const escopoVendas = whereVendasDoUsuario(session);
  const where = {
    ...(consulta.idVenda ? { id: consulta.idVenda } : {}),
    ...(idsTexto ? { id: { in: idsTexto } } : {}),
    ...(ehAdmin && consulta.vendedor ? { vendedor: consulta.vendedor } : {}),
    ...(consulta.forma ? { formaPagamento: consulta.forma } : {}),
    ...(consulta.assinatura === "assinado" ? { assinatura: { is: { assinaturaStatus: "assinado" } } } : {}),
    // AND evita que o OR do escopo e o NOT/status do "pendente" se sobrescrevam.
    AND: [...(consulta.assinatura === "pendente" ? [whereAssinaturaPendente()] : []), escopoVendas],
  };

  const [vendasBD, totalVendas] = await Promise.all([
    prisma.venda.findMany({
      where,
      orderBy: [{ dataVenda: "desc" }, { id: "desc" }],
      take: MAX_ITENS,
      select: {
        id: true,
        dataVenda: true,
        valorVenda: true,
        quantidade: true,
        valorFrete: true,
        desconto: true,
        itens: { select: { subtotal: true } },
        assinaturaToken: true,
        assinatura: { select: { assinaturaStatus: true } },
        cliente: { select: { nome: true } },
      },
    }),
    prisma.venda.count({ where }),
  ]);

  // Clientes: só por texto; vendedor vê apenas os das próprias vendas.
  let clientesBD: { id: number; nome: string }[] = [];
  if (!consulta.idVenda && consulta.termo) {
    const ids = await unaccentFindClienteIds(consulta.termo, 500);
    if (ids.length > 0) {
      clientesBD = await prisma.cliente.findMany({
        where: {
          id: { in: ids },
          ...(escopo ? { vendas: { some: escopoVendas } } : {}),
        },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
        take: MAX_ITENS,
      });
    }
  }

  return NextResponse.json(
    {
      sugestao: consulta.urlHistorico ? { titulo: rotuloSugestao(consulta), url: consulta.urlHistorico } : null,
      vendas: vendasBD.map((v) => ({
        id: v.id,
        cliente: v.cliente?.nome ?? "—",
        data: v.dataVenda.toISOString().slice(0, 10),
        valor: Math.round(valorTotalVenda(v) * 100) / 100,
        statusAssinatura: statusAssinaturaDe(v),
      })),
      clientes: clientesBD.map((c) => ({ id: c.id, nome: c.nome })),
      totalVendas,
    },
    { headers: SEM_CACHE },
  );
}
