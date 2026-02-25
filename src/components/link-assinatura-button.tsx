"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, QrCode } from "lucide-react";
import { toast } from "sonner";

type Props = {
  token: string;
  status?: string | null;
  label?: string;
  showQr?: boolean;
};

export function LinkAssinaturaButton({ token, status, label = "Copiar link", showQr = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${baseUrl}/assinatura/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado! Envie ao cliente para assinar.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const isAssinado = status === "assinado";

  return (
    <div className="flex flex-col items-center gap-1">
      {isAssinado ? (
        <span className="text-xs text-success font-medium">Assinado</span>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  {label}
                </>
              )}
            </Button>
            {showQr && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setQrVisible((v) => !v)}
                title="Mostrar QR Code"
              >
                <QrCode className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {showQr && qrVisible && (
            <div className="mt-2 rounded-lg border border-border bg-card p-2">
              <img src={qrUrl} alt="QR Code" width={120} height={120} className="rounded" />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Cliente escaneia para assinar</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
