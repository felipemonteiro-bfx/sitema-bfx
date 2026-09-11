import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { revalidarConfig } from "@/lib/revalidacao";
import { uploadToMinIO, isMinIOConfigured } from "@/lib/minio";
import { deveRecusarUpload, exigeStorageDuravel, montarChaveLogo } from "@/lib/storage-policy";
import {
  ERRO_IMAGEM_GRANDE,
  MIMES_LOGO,
  TAMANHO_MAXIMO_IMAGEM,
  corpoGrandeDemais,
  nomeComExtensaoReal,
  validarImagem,
} from "@/lib/upload-imagem";

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
  // O logo sai no recibo, no boleto e nos PDFs de toda venda: so admin troca.
  // O middleware ja exige sessao; aqui e o perfil (revisao de seguranca, 2026-09-11).
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Somente administradores podem trocar o logo." }, { status: 403 });
  }
  // Recusa pelo Content-Length antes de ler o formulario inteiro para a memoria.
  if (corpoGrandeDemais(req)) {
    return NextResponse.json({ error: ERRO_IMAGEM_GRANDE }, { status: 413 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
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

    if (file.size > TAMANHO_MAXIMO_IMAGEM) {
      return NextResponse.json({ error: ERRO_IMAGEM_GRANDE }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // Tipo pelos bytes, nunca pelo `file.type` do navegador. So PNG e JPEG: o
    // PDF do recibo nao embute WebP, e a extensao da chave sai do tipo real
    // (ver @/lib/upload-imagem e logo-loader.ts).
    const validacao = validarImagem(buffer, MIMES_LOGO);
    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.erro }, { status: validacao.status });
    }
    const contentType = validacao.tipo.mime;
    const nomeSeguro = nomeComExtensaoReal(file.name, validacao.tipo);

    if (isMinIOConfigured()) {
      const chave = montarChaveLogo(nomeSeguro, Date.now());
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
    const filename = `${Date.now()}-${nomeSeguro}`;
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
