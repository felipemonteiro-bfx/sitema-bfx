import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const produtos = await prisma.produto.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        valorVenda: true,
        imagem: true,
        marca: true,
        categoria: true
      }
    });

    const formatBRL = (v: number | null) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const html = `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Catálogo de Produtos - BFX Manager</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            .no-print { display: none; }
            body { background: white; }
            .product-card { break-inside: avoid; }
          }
          body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        </style>
      </head>
      <body class="p-8">
        <div class="max-w-5xl mx-auto">
          <header class="flex justify-between items-center mb-12 border-b-2 border-blue-900 pb-6">
            <div>
              <h1 class="text-4xl font-black text-blue-900 tracking-tighter">CATÁLOGO BFX</h1>
              <p class="text-slate-500 font-medium">Lista de Produtos e Preços</p>
            </div>
            <div class="text-right no-print">
              <button onclick="window.print()" class="bg-blue-900 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-800 transition-all shadow-lg">
                Imprimir / Salvar PDF
              </button>
            </div>
          </header>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            ${produtos.map(p => `
              <div class="product-card bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full transform transition-all hover:scale-[1.02]">
                <div class="relative aspect-square bg-slate-100 flex items-center justify-center">
                  ${p.imagem 
                    ? `<img src="${p.imagem}" class="w-full h-full object-cover" alt="${p.nome}">`
                    : `<div class="text-slate-300 font-bold text-lg italic">Sem Foto</div>`
                  }
                  <div class="absolute top-3 left-3 bg-blue-900/90 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase">
                    ${p.categoria || 'Geral'}
                  </div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                  <div class="mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">${p.marca || 'BFX'}</div>
                  <h3 class="text-lg font-bold text-slate-800 leading-tight mb-4 flex-grow">${p.nome}</h3>
                  <div class="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span class="text-2xl font-black text-blue-900">${formatBRL(p.valorVenda)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <footer class="mt-16 text-center text-slate-400 text-sm border-t pt-8">
            <p>Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} por BFX Manager</p>
          </footer>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Erro ao gerar catálogo:", error);
    return NextResponse.json({ error: "Failed to generate catalog" }, { status: 500 });
  }
}
