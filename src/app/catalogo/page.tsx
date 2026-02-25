import { prisma } from "@/lib/db";
import { CatalogoPublicoClient } from "@/components/catalogo-publico-client";
import Image from "next/image";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo de Produtos | BFX",
  description: "Confira nossa lista de produtos e preços. Catálogo atualizado em tempo real.",
  openGraph: {
    title: "Catálogo de Produtos | BFX",
    description: "Confira nossa lista de produtos e preços. Catálogo atualizado em tempo real.",
    type: "website",
  },
};

export default async function CatalogoPage() {
  const [produtos, cfg] = await Promise.all([
    prisma.produto.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        valorVenda: true,
        imagem: true,
        marca: true,
        categoria: true,
      },
    }),
    prisma.config.findFirst(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            {cfg?.logoPath ? (
              <div className="relative h-12 w-auto">
                <Image
                  src={cfg.logoPath}
                  alt="Logo"
                  width={120}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-black tracking-tight text-blue-900 dark:text-blue-400">
                BFX
              </h1>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Catálogo de Produtos
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Atualizado em tempo real
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <CatalogoPublicoClient produtos={produtos} />
      </main>

      <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Gerado por BFX Manager · Catálogo automático
        </p>
      </footer>
    </div>
  );
}
