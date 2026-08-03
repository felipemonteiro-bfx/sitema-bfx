import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { cleanupMinIOPrefix, isMinIOConfigured } from "@/lib/minio";
import { logCron, logCronError } from "@/lib/logger";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_AGE_DAYS = 90;
// Artefatos de relatorio no MinIO sao regeneraveis sob demanda — limpeza mais agressiva.
const MINIO_REPORT_MAX_AGE_DAYS = 180;

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

    // D-05 (Fase 5, STO-06): este cron NAO ganha logica de remocao de asset no MinIO.
    // O escopo da limpeza remota fica restrito ao prefixo de relatorios mensais
    // (artefatos regeneraveis sob demanda) porque a funcao de housekeeping abaixo carrega
    // aviso explicito de nao ser segura em prefixos de assets vivos (imagens de produto,
    // logo) — varrer por caminho antigo arriscaria remover um asset ainda referenciado no
    // banco. STO-06 e satisfeito por nao-remocao. Travado por
    // src/__tests__/cleanup-uploads-cron.test.ts — nao estender esta chamada para cobrir
    // assets sem reabrir essa discussao com o produto.
    // Housekeeping do MinIO: remove apenas artefatos de relatorio antigos (regeneraveis).
    let minioRemovidos = 0;
    if (isMinIOConfigured()) {
      try {
        minioRemovidos = await cleanupMinIOPrefix("relatorios/mensal/", MINIO_REPORT_MAX_AGE_DAYS);
      } catch (e) {
        logCronError("cleanup-uploads", "minio_cleanup_falhou", e);
      }
    }

    logCron("cleanup-uploads", "concluido", { deleted, minioRemovidos });
    return NextResponse.json({ ok: true, deleted, minioRemovidos });
  } catch (error) {
    logCronError("cleanup-uploads", "erro_geral", error);
    return NextResponse.json(
      { error: "Erro ao executar limpeza" },
      { status: 500 }
    );
  }
}
