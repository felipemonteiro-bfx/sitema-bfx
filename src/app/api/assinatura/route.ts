
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { PDFDocument } from 'pdf-lib';
import { generateReciboPdf } from '@/lib/recibo-pdf';
import { uploadToMinIO, isMinIOConfigured } from '@/lib/minio';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
  }

  try {
    const venda = await prisma.venda.findUnique({
      where: {
        assinaturaToken: token,
      },
      include: {
        cliente: true,
        itens: true,
        parcelasVencimento: { orderBy: { numeroParcela: 'asc' } },
      },
    });

    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    // Check if it's already signed
    const assinatura = await prisma.assinatura.findFirst({
      where: {
        vendaId: venda.id,
        assinaturaStatus: 'assinado',
      },
    });

    if (assinatura) {
      return NextResponse.json({ error: 'Esta venda já foi assinada.' }, { status: 409 });
    }

    return NextResponse.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { token, signature } = await request.json();

  if (!token || !signature) {
    return NextResponse.json({ error: 'Token e assinatura são obrigatórios' }, { status: 400 });
  }

  try {
    const venda = await prisma.venda.findUnique({
      where: {
        assinaturaToken: token,
      },
    });

    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const existingAssinatura = await prisma.assinatura.findFirst({
      where: {
        vendaId: venda.id,
      },
    });

    if (existingAssinatura && existingAssinatura.assinaturaStatus === 'assinado') {
      return NextResponse.json({ error: 'Esta venda já foi assinada.' }, { status: 409 });
    }

    // Generate the full recibo PDF with embedded signature
    const pdfBytes = await generateReciboPdf(venda.id, 'autorizacao');
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const signatureBuffer = Buffer.from(signature.split(',')[1], 'base64');
    const pngImage = await pdfDoc.embedPng(signatureBuffer);
    const page = pdfDoc.getPages()[0];

    // Scale signature to fit within the signature area (200pt wide, 45pt tall max)
    // preserving the natural aspect ratio of what was actually drawn
    const signatureY = 70; // matches recibo-pdf.ts
    const maxSigWidth = 200;
    const maxSigHeight = 45;
    const naturalW = pngImage.width;
    const naturalH = pngImage.height;
    const scale = Math.min(maxSigWidth / naturalW, maxSigHeight / naturalH);
    const sigWidth = naturalW * scale;
    const sigHeight = naturalH * scale;
    const centerX = 595 / 2;

    page.drawImage(pngImage, {
      x: centerX - sigWidth / 2,
      y: signatureY - sigHeight,  // bottom of image sits at signature line
      width: sigWidth,
      height: sigHeight,
    });

    const signedPdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(signedPdfBytes);

    // Try MinIO first (when configured)
    if (isMinIOConfigured()) {
      try {
        await uploadToMinIO(
          pdfBuffer,
          `recibos/assinado-${venda.id}-${Date.now()}.pdf`,
          'application/pdf'
        );
      } catch (err) {
        console.warn('MinIO upload failed, continuing with DB storage:', err);
      }
    }

    // Always store in Documento table as authoritative copy
    await prisma.documento.create({
      data: {
        vendaId: venda.id,
        tipo: 'comprovante_assinatura',
        mimeType: 'application/pdf',
        conteudo: pdfBuffer,
        tamanhoBytes: pdfBuffer.length,
      },
    });

    await prisma.assinatura.upsert({
      where: { vendaId: venda.id },
      update: {
        assinaturaStatus: 'assinado',
        assinaturaEm: new Date(),
      },
      create: {
        vendaId: venda.id,
        assinaturaStatus: 'assinado',
        assinaturaEm: new Date(),
      },
    });

    await prisma.notificacao.create({
      data: {
        mensagem: `A venda #${venda.id} foi assinada pelo cliente.`,
        link: `/historico`,
      },
    });

    return NextResponse.json({ message: 'Assinatura recebida com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar assinatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
