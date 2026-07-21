import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.id ?? null;

    // Show: notifications targeted to this user OR global (usuarioId = null)
    const notificacoes = await prisma.notificacao.findMany({
      where: {
        lida: false,
        OR: [
          { usuarioId: userId },
          { usuarioId: null },
        ],
      },
      orderBy: { criadoEm: 'desc' },
      take: 20,
    });
    return NextResponse.json(notificacoes);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids obrigatório' }, { status: 400 });
    }
    await prisma.notificacao.updateMany({
      where: { id: { in: ids } },
      data: { lida: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
