import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { montarPayloadClienteRapido, mensagemClienteDuplicado } from "@/lib/cliente-rapido";

const SELECT_CLIENTE_RAPIDO = {
  id: true,
  nome: true,
  telefone: true,
  cpf: true,
  cnpj: true,
  endereco: true,
  cep: true,
} as const;

/**
 * POST /api/clientes
 *
 * Cadastro rapido de cliente pelo PDV (D-04, D-07, PDV-15). Exige sessao
 * autenticada antes de qualquer leitura do corpo ou chamada ao Prisma
 * (T-07-05). Devolve exatamente os campos que o estado `selectedCliente` do
 * PDV consome, para o modal nao precisar de uma segunda requisicao.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const resultado = montarPayloadClienteRapido(body);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  const { nome, telefone, cpf } = resultado.dados;

  try {
    const cliente = await prisma.cliente.create({
      data: { nome, telefone, cpf },
      select: SELECT_CLIENTE_RAPIDO,
    });

    await createAuditLog("cliente:create", { clienteId: cliente.id, nome: cliente.nome });

    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    // Duck typing no campo `code` (mesmo padrao de src/app/api/produtos/route.ts):
    // os testes mockam `@/lib/db` e nao carregam o client gerado do Prisma,
    // entao `instanceof` nao funcionaria aqui.
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      // T-07-06: nunca devolver o erro cru do Prisma nem o cliente existente
      // (nome igual pode ser outra pessoa — D-05 e quem previne o caso antes
      // do envio, via aviso de nome parecido).
      return NextResponse.json({ error: mensagemClienteDuplicado(nome) }, { status: 409 });
    }
    throw err;
  }
}
