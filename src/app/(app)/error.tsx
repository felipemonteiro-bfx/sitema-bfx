"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  const canShowDetails =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SHOW_ERROR_DETAILS === "true";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="anim-entrada w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="text-lg font-semibold text-foreground">Algo deu errado</div>
          <div className="text-sm text-muted-foreground">
            Ocorreu um erro ao carregar esta página. Tente novamente.
          </div>
          {canShowDetails && (
            <div className="w-full space-y-2 text-left">
              <Button
                type="button"
                variant="discreto"
                size="sm"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}

              >
                {expanded ? "Ocultar detalhes" : "Mostrar detalhes do erro"}
              </Button>
              {expanded && (
                <pre className="max-h-40 overflow-auto rounded-interno bg-poco p-3 text-xs">
                  {error.message}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => reset()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
