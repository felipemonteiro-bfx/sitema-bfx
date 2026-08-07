import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { revalidarConfig } from "@/lib/revalidacao";
import { uploadToMinIO, isMinIOConfigured } from "@/lib/minio";
import { deveRecusarUpload, exigeStorageDuravel, montarChaveLogo } from "@/lib/storage-policy";

async function persistirLogoPath(logoPath: string) {
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { logoPath } });
  } else {
    await prisma.config.create({ data: { logoPath } });
  }
  // O logo aparece no dashboard, nos recibos e nos boletos.
  revalidarConfig();
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Guarda de producao (STO-04): sem storage duravel configurado, recusar
    // explicitamente ANTES de qualquer escrita em disco. O disco do pod e
    // efemero e o fallback silencioso mascarou o problema por meses.
    if (deveRecusarUpload(process.env)) {
      return NextResponse.json(
        { error: "Armazenamento de arquivos nao configurado." },
        { status: 503 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/png";

    if (isMinIOConfigured()) {
      const chave = montarChaveLogo(file.name, Date.now());
      try {
        const url = await uploadToMinIO(buffer, chave, contentType);
        if (url) {
          await persistirLogoPath(url);
          return NextResponse.json({ success: true, filePath: url });
        }
      } catch (err) {
        console.error("Error uploading logo to MinIO:", err);
      }

      // uploadToMinIO devolveu null ou lancou: em producao o disco efemero
      // nunca e alternativa.
      if (exigeStorageDuravel(process.env)) {
        return NextResponse.json(
          { error: "Falha ao enviar arquivo para o armazenamento." },
          { status: 503 }
        );
      }
    }

    // Fallback legado (somente fora de producao): disco efemero de public/uploads.
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/${filename}`;
    await persistirLogoPath(publicPath);

    return NextResponse.json({ success: true, filePath: publicPath });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Erro ao enviar arquivo." }, { status: 500 });
  }
}
