import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateReciboPdf } from "@/lib/recibo-pdf";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  const venda = await prisma.venda.findUnique({
    where: { assinaturaToken: token },
    include: { cliente: true },
  });

  if (!venda) return NextResponse.json({ error: "Link não encontrado ou expirado" }, { status: 404 });

  if (venda.assinaturaStatus === "assinado") {
    return NextResponse.json({
      status: "assinado",
      message: "Este documento já foi assinado.",
      comprovantePdf: venda.comprovantePdf,
    });
  }

  return NextResponse.json({
    status: venda.assinaturaStatus || "pendente",
    vendaId: venda.id,
    clienteNome: venda.cliente?.nome || "N/D",
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  const venda = await prisma.venda.findUnique({
    where: { assinaturaToken: token },
    include: { cliente: true },
  });

  if (!venda) return NextResponse.json({ error: "Link não encontrado ou expirado" }, { status: 404 });
  if (venda.assinaturaStatus === "assinado") {
    return NextResponse.json({ error: "Este documento já foi assinado." }, { status: 400 });
  }

  const formData = await req.formData();
  const signatureBase64 = formData.get("signature") as string | null;
  if (!signatureBase64) return NextResponse.json({ error: "Assinatura não enviada" }, { status: 400 });

  // Remove data URL prefix if present
  const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
  const signatureBuffer = Buffer.from(base64Data, "base64");

  try {
    const pdfBytes = await generateReciboPdf(venda.id, "autorizacao");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    const pngImage = await pdfDoc.embedPng(signatureBuffer);
    const centerX = 595 / 2;
    const signatureY = 70;
    const sigWidth = 150;
    const sigHeight = 50;
    const x = centerX - sigWidth / 2;
    const y = signatureY - sigHeight;

    page.drawImage(pngImage, {
      x,
      y,
      width: sigWidth,
      height: sigHeight,
    });

    const signedPdfBytes = await pdfDoc.save();

    const uploadDir = path.join(process.cwd(), "public", "uploads", "recibos");
    await mkdir(uploadDir, { recursive: true });
    const filename = `assinado-${venda.id}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(signedPdfBytes));

    const comprovantePath = `/uploads/recibos/${filename}`;

    await prisma.venda.update({
      where: { id: venda.id },
      data: {
        comprovantePdf: comprovantePath,
        assinaturaStatus: "assinado",
        assinaturaEm: new Date(),
      },
    });

    return NextResponse.json({ success: true, comprovantePdf: comprovantePath });
  } catch (err) {
    console.error("Erro ao processar assinatura:", err);
    return NextResponse.json({ error: "Erro ao salvar assinatura. Tente novamente." }, { status: 500 });
  }
}
