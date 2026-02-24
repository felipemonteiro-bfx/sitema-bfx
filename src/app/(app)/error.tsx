"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-lg font-semibold">Algo deu errado</div>
      <div className="text-sm text-muted-foreground">
        Ocorreu um erro ao carregar esta página. Tente novamente.
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </div>
    </div>
  );
}
