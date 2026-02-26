import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarWhatsAppTexto, getWhatsAppConfig } from "@/lib/whatsapp";

/**
 * Parabéns no aniversário: clientes com dataNascimento = hoje.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const waConfig = await getWhatsAppConfig();
    if (!waConfig?.autoAniversario) {
      return NextResponse.json({ ok: true, enviados: 0, total: 0, desativado: true });
    }

    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth();

    const clientes = await prisma.cliente.findMany({
      where: {
        telefone: { not: null },
        dataNascimento: { not: null },
      },
    });

    const aniversariantes = clientes.filter((c) => {
      if (!c.dataNascimento) return false;
      const d = new Date(c.dataNascimento);
      return d.getDate() === dia && d.getMonth() === mes;
    });

    let enviados = 0;
    const erros: string[] = [];

    for (const c of aniversariantes) {
      if (!c.telefone) continue;
      const msg = `Feliz aniversário, ${c.nome}! Desejamos muito sucesso e esperamos vê-lo(a) em breve por aqui.`;
      const ok = await enviarWhatsAppTexto(c.telefone, msg);
      if (ok) enviados++;
      else erros.push(c.nome);
    }

    return NextResponse.json({
      ok: true,
      total: aniversariantes.length,
      enviados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no aniversário:", error);
    return NextResponse.json(
      { error: "Erro ao enviar parabéns" },
      { status: 500 }
    );
  }
}
