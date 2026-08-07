import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";
import { classificarNomeFornecedor } from "@/lib/fornecedor-import";
import { revalidarFornecedor } from "@/lib/revalidacao";

export async function POST(request: NextRequest) {
  // Sessao e checada ANTES de ler o corpo e antes de qualquer chamada ao
  // Prisma (T-07-10) — nunca vira uma escrita anonima no cadastro.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  let nomeNormalizado = "";

  try {
    const body = await request.json();
    const telefoneCru = String(body.telefone ?? "").trim();
    const telefone = telefoneCru.length > 0 ? telefoneCru : null;

    // Le existentes SEM filtrar excluidos: e o que permite reativar em vez
    // de estourar o @unique de nome (D-06, T-07-13).
    const candidatos = await prisma.fornecedor.findMany({
      select: { id: true, nome: true, deletedAt: true },
    });

    // A decisao criar/reativar/ignorar vem inteira da Fase 6 (D-06) — nunca
    // reimplementar normalizacao/comparacao de nome aqui.
    const classificacao = classificarNomeFornecedor(body.nome, candidatos);
    nomeNormalizado = classificacao.nomeNormalizado;

    if (classificacao.acao === "erro") {
      return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
    }

    if (classificacao.acao === "criar") {
      const fornecedor = await prisma.fornecedor.create({
        data: { nome: classificacao.nomeNormalizado, telefone },
        select: { id: true, nome: true },
      });
      await createAuditLog("fornecedor:create", {
        fornecedorId: fornecedor.id,
        nome: fornecedor.nome,
      });
      // Invalida o cache de servidor; o refresh da tela e do componente que chamou.
      revalidarFornecedor();
      return NextResponse.json(
        { id: fornecedor.id, nome: fornecedor.nome, reativado: false, jaExistia: false },
        { status: 201 }
      );
    }

    if (classificacao.acao === "reativar" && classificacao.id != null) {
      const fornecedor = await prisma.fornecedor.update({
        where: { id: classificacao.id },
        data: { deletedAt: null, telefone },
        select: { id: true, nome: true },
      });
      revalidarFornecedor();
      await createAuditLog("fornecedor:restore", {
        fornecedorId: fornecedor.id,
        nome: fornecedor.nome,
      });
      return NextResponse.json(
        { id: fornecedor.id, nome: fornecedor.nome, reativado: true, jaExistia: false },
        { status: 200 }
      );
    }

    // "ignorar": nome ja ativo — nenhuma escrita, so devolve o registro
    // encontrado para o modal poder selecionar.
    return NextResponse.json(
      {
        id: classificacao.id,
        nome: classificacao.nomeNormalizado,
        reativado: false,
        jaExistia: true,
      },
      { status: 200 }
    );
  } catch (err) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      // Corrida entre a leitura de existentes e o create/update — mensagem
      // legivel citando so o nome, nunca o erro cru do Prisma (T-07-12).
      return NextResponse.json(
        { error: `Fornecedor "${nomeNormalizado}" ja existe` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erro ao cadastrar fornecedor" }, { status: 500 });
  }
}
