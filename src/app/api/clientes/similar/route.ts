import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type IdRow = { id: number };

/**
 * GET /api/clientes/similar?nome=X
 *
 * Returns up to 5 clients with similar names using pg_trgm fuzzy matching.
 * Used for duplicate detection when registering new clients.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nome = (searchParams.get("nome") || "").trim();

  if (!nome || nome.length < 3) {
    return NextResponse.json({ similares: [] });
  }

  try {
    const rows = await prisma.$queryRawUnsafe<IdRow[]>(
      `SELECT id
       FROM "clientes"
       WHERE similarity(f_unaccent(lower("nome")), f_unaccent(lower($1))) > $2
          OR f_unaccent(lower("nome")) ILIKE '%' || f_unaccent(lower($1)) || '%'
       ORDER BY similarity(f_unaccent(lower("nome")), f_unaccent(lower($1))) DESC
       LIMIT 5`,
      nome,
      0.3
    );

    if (rows.length === 0) {
      return NextResponse.json({ similares: [] });
    }

    const ids = rows.map((r) => r.id);
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });

    return NextResponse.json({ similares: clientes });
  } catch (err) {
    console.error("[clientes/similar] erro:", err);
    return NextResponse.json({ similares: [] });
  }
}
