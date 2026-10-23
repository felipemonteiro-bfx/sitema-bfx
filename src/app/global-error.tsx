"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

// Roda sem o layout raiz (sem providers nem fontes): só classes utilitárias e tokens de
// cor, e `buttonVariants` (função pura, sem contexto) nos links.
export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-4 rounded-painel border border-painel-borda bg-card p-6 text-center">
            <div className="text-lg font-semibold">Algo deu errado</div>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao carregar a aplicação. Tente novamente.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/" className={buttonVariants()}>
                Voltar ao início
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Recarregar
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
