import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health
 *
 * Health check para probes do Kubernetes (readiness). Verifica conectividade com
 * o banco via `SELECT 1`. Retorna 503 se o DB estiver inacessivel.
 * Sem autenticacao (endpoint interno de infra).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", uptime: process.uptime() });
  } catch (error) {
    console.error("[health] DB check falhou:", error);
    return NextResponse.json(
      { ok: false, db: "down", error: error instanceof Error ? error.message : String(error) },
      { status: 503 }
    );
  }
}
