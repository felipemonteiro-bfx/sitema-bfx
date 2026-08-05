'use client';

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        {/* Era um `<svg>` inline; o resto do sistema desenha icone com lucide. */}
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Sem conexão</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
      {/* Era um `<button>` com estilo a mao: peso 600 contra os 500 do
          `<Button>`, padding 20/10 contra 16/8, e sem `focus-visible`, `hover`
          nem `active:scale`. Fase 18, achado 7. */}
      <Button className="mt-2" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </div>
  );
}
