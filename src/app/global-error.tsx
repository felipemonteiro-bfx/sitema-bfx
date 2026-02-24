"use client";

export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card/90 p-6 text-center shadow-sm">
            <div className="text-lg font-semibold">Algo deu errado</div>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao carregar a aplica??o. Tente novamente.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Voltar ao in?cio
              </a>
              <a
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium"
              >
                Recarregar
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
