import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_AGE_DAYS = 90;

/**
 * Remove arquivos em public/uploads que não estão referenciados no banco
 * e são mais antigos que MAX_AGE_DAYS.
 * Chamado por Vercel Cron ou manualmente (requer CRON_SECRET).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const [produtos, config] = await Promise.all([
      prisma.produto.findMany({ select: { imagem: true } }),
      prisma.config.findFirst({ select: { logoPath: true } }),
    ]);

    const referenced = new Set<string>();
    const addRef = (p: string) => {
      if (p) referenced.add(p.replace(/\\/g, "/"));
    };
    produtos.forEach((p) => addRef(p.imagem ?? ""));
    if (config?.logoPath) addRef(config.logoPath);

    let deleted = 0;
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    const dirs = [
      path.join(UPLOADS_DIR),
      path.join(UPLOADS_DIR, "recibos"),
      path.join(UPLOADS_DIR, "produtos"),
    ];

    for (const dir of dirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(path.join(process.cwd(), "public"), fullPath).replace(/\\/g, "/");
          const refPath = "/" + relPath;
          if (referenced.has(refPath)) continue;

          const stat = await fs.stat(fullPath);
          if (stat.mtimeMs < cutoff) {
            await fs.unlink(fullPath);
            deleted++;
          }
        }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("Erro no cleanup de uploads:", error);
    return NextResponse.json(
      { error: "Erro ao executar limpeza" },
      { status: 500 }
    );
  }
}
