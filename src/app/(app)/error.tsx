"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";
  const showDetails = isDev || process.env.NEXT_PUBLIC_SHOW_ERROR_DETAILS === "true";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-lg font-semibold">Algo deu errado</div>
      <div className="text-sm text-muted-foreground">
        Ocorreu um erro ao carregar esta página. Tente novamente.
      </div>
      {showDetails && (
        <div className="w-full max-w-md space-y-2 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showDetails ? "Ocultar detalhes" : "Mostrar detalhes do erro"}
          </button>
          {showDetails && (
            <pre className="max-h-40 overflow-auto rounded border border-border bg-muted/50 p-3 text-xs">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </div>
    </div>
  );
}
