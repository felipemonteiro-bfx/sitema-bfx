import { prisma } from "@/lib/db";
import { CatalogoPublicoClient } from "@/components/catalogo-publico-client";
import Image from "next/image";
import type { Metadata } from "next";
import { logoSrcParaBrowser } from "@/lib/storage-policy";

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            {cfg?.logoPath ? (
              <div className="relative h-12 w-auto">
                <Image
                  src={logoSrcParaBrowser(cfg.logoPath)}
                  alt="Logo"
                  width={120}
                  height={48}
                  unoptimized
                  className="h-12 w-auto object-contain"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-black tracking-tight text-info">
                BFX
              </h1>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Catálogo de Produtos
              </h1>
              <p className="text-sm text-muted-foreground">
                Atualizado em tempo real
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <CatalogoPublicoClient produtos={produtos} />
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-sm text-muted-foreground">
          Gerado por BFX Manager · Catálogo automático
        </p>
      </footer>
    </div>
  );
}
