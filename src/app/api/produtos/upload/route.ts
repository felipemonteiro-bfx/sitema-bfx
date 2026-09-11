import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { uploadToMinIO, isMinIOConfigured } from "@/lib/minio";
import { deveRecusarUpload, exigeStorageDuravel } from "@/lib/storage-policy";
import { ERRO_IMAGEM_GRANDE, TAMANHO_MAXIMO_IMAGEM, corpoGrandeDemais, nomeComExtensaoReal, validarImagem } from "@/lib/upload-imagem";

export async function POST(req: Request) {
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
    // efemero e o fallback silencioso mascarou o problema por meses (mesma
    // guarda usada em @/app/api/upload-logo/route.ts).
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
    // Tipo pelos bytes, nunca pelo `file.type` do navegador; nome sem caminho e
    // com a extensao do tipo real (ver @/lib/upload-imagem).
    const validacao = validarImagem(buffer);
    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.erro }, { status: validacao.status });
    }
    const filename = `${Date.now()}-${nomeComExtensaoReal(file.name, validacao.tipo)}`;
    const contentType = validacao.tipo.mime;

    // Preferir MinIO quando configurado
    if (isMinIOConfigured()) {
      try {
        const url = await uploadToMinIO(buffer, filename, contentType);
        if (url) {
          return NextResponse.json({ success: true, filePath: url });
        }
      } catch (err) {
        console.error("Error uploading product image to MinIO:", err);
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

    // Fallback: salvar no disco local (public/uploads/produtos)
    const uploadDir = path.join(process.cwd(), "public/uploads/produtos");
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    const publicPath = `/uploads/produtos/${filename}`;

    return NextResponse.json({ success: true, filePath: publicPath });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return NextResponse.json({ error: "Erro ao enviar arquivo." }, { status: 500 });
  }
}
