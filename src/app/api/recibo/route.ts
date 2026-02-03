import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") || 0);
  if (!id) return new Response("ID inválido", { status: 400 });

  const venda = await prisma.venda.findUnique({ where: { id } });
  if (!venda) return new Response("Venda não encontrada", { status: 404 });
  const cliente = venda.clienteId
    ? await prisma.cliente.findUnique({ where: { id: venda.clienteId } })
    : null;
  const cfg = await prisma.config.findFirst();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 780;
  page.drawText("Recibo BFX", { x: 40, y, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 30;
  const lines = [
    `Data: ${venda.dataVenda.toISOString().slice(0, 10)}`,
    `Cliente: ${cliente?.nome || "N/D"}`,
    `Produto: ${venda.produtoNome || ""}`,
    `Valor: R$ ${(venda.valorVenda || 0).toFixed(2)}`,
    `Frete: R$ ${(venda.valorFrete || 0).toFixed(2)}`,
    `Parcelas: ${venda.parcelas || 1}`,
  ];
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 12, font });
    y -= 18;
  }
  y -= 10;
  const contrato = cfg?.modeloContrato || "Obrigado pela preferência.";
  page.drawText(contrato, { x: 40, y, size: 11, font, color: rgb(0.2, 0.2, 0.2), maxWidth: 520 });
  const pdfBytes = await pdf.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo_${id}.pdf"`,
    },
  });
}
