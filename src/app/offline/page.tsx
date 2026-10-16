'use client';

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <Card className="anim-entrada w-full max-w-sm text-center">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          {/* Ícone neutro, sem chip colorido (padrão Vantage). */}
          <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Sem conexão</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            Você está offline. Verifique sua conexão e tente novamente.
          </p>
          <Button className="mt-2" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
