import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/empresas/autocomplete?q=...
 * Returns partner companies for combobox selection.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  const empresas = await prisma.empresaParceira.findMany({
    where: q
      ? { nome: { contains: q, mode: "insensitive" } }
      : {},
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
    take: 30,
  });

  return NextResponse.json({ options: empresas });
}
