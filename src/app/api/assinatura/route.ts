
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { PDFDocument } from 'pdf-lib';
import { generateReciboPdf } from '@/lib/recibo-pdf';
import { uploadToMinIO, isMinIOConfigured } from '@/lib/minio';
import { enviarTermoAssinadoAoRh } from '@/lib/email';

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

  let claimOwned = false;
  let claimedVendaId: number | null = null;

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

    // Claim the unique Assinatura row before doing expensive PDF work. Only the
    // request that changes pendente/expirado/null to processando may continue.
    const claim = await prisma.assinatura.updateMany({
      where: {
        vendaId: venda.id,
        OR: [
          { assinaturaStatus: 'pendente' },
          { assinaturaStatus: 'expirado' },
          { assinaturaStatus: null },
        ],
      },
      data: { assinaturaStatus: 'processando' },
    });

    if (claim.count === 0) {
      if (existingAssinatura) {
        return NextResponse.json({ error: 'Esta assinatura já está sendo processada.' }, { status: 409 });
      }
      try {
        await prisma.assinatura.create({
          data: { vendaId: venda.id, assinaturaStatus: 'processando' },
        });
      } catch (error) {
        if ((error as { code?: string })?.code === 'P2002') {
          return NextResponse.json({ error: 'Esta assinatura já está sendo processada.' }, { status: 409 });
        }
        throw error;
      }
    }
    claimOwned = true;
    claimedVendaId = venda.id;

    // Generate the full recibo PDF with embedded signature
    const pdfBytes = await generateReciboPdf(venda.id, 'autorizacao');
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const signatureBuffer = Buffer.from(signature.split(',')[1], 'base64');
    const pngImage = await pdfDoc.embedPng(signatureBuffer);
    const page = pdfDoc.getPages()[0];

    // Signature sits above the line: image bottom edge = signatureY (the line),
    // image grows upward. Space available: Y=70 to Y=108 (38pt, below doc footer text).
    const signatureY = 70; // matches recibo-pdf.ts
    const maxSigWidth = 200;
    const maxSigHeight = 38;
    const naturalW = pngImage.width;
    const naturalH = pngImage.height;
    const scale = Math.min(maxSigWidth / naturalW, maxSigHeight / naturalH);
    const sigWidth = naturalW * scale;
    const sigHeight = naturalH * scale;
    const centerX = 595 / 2;

    page.drawImage(pngImage, {
      x: centerX - sigWidth / 2,
      y: signatureY,  // bottom of image touches the signature line, grows upward
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

    // Persist the authoritative PDF and finalize the claim together. A failed
    // transaction rolls back the document, so a retry cannot duplicate it.
    await prisma.$transaction(async (tx) => {
      await tx.documento.create({
        data: {
          vendaId: venda.id,
          tipo: 'comprovante_assinatura',
          mimeType: 'application/pdf',
          conteudo: pdfBuffer,
          tamanhoBytes: pdfBuffer.length,
        },
      });
      await tx.assinatura.update({
        where: { vendaId: venda.id },
        data: {
          assinaturaStatus: 'assinado',
          assinaturaEm: new Date(),
        },
      });
    });
    claimOwned = false;

    try {
      await enviarTermoAssinadoAoRh(venda.id);
    } catch (error) {
      console.error('Erro ao notificar RH sobre termo assinado:', error);
    }

    await prisma.notificacao.create({
      data: {
        mensagem: `A venda #${venda.id} foi assinada pelo cliente.`,
        link: `/historico`,
      },
    });

    return NextResponse.json({ message: 'Assinatura recebida com sucesso!' });
  } catch (error) {
    if (claimOwned) {
      try {
        await prisma.assinatura.updateMany({
          where: { vendaId: claimedVendaId as number, assinaturaStatus: 'processando' },
          data: { assinaturaStatus: 'pendente' },
        });
      } catch (resetError) {
        console.error('Erro ao liberar claim da assinatura:', resetError);
      }
    }
    console.error('Erro ao salvar assinatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
