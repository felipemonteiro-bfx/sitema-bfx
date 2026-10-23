"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pen } from "lucide-react";

type Props = {
  token: string;
  clienteNome: string;
};

export function AssinaturaFormClient({ token, clienteNome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContext = () => canvasRef.current?.getContext("2d");

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = getContext();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x * scaleX, y * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x * scaleX, y * scaleY);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!hasDrawn) {
      setError("Por favor, assine na área acima.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const formData = new FormData();
      formData.set("signature", dataUrl);

      const res = await fetch(`/api/assinatura/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar assinatura.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar assinatura. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <CheckCircle2 className="h-10 w-10 text-success-text" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Documento assinado com sucesso!</h2>
          <p className="mt-2 text-muted-foreground">
            O comprovante foi registrado. O vendedor será notificado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Visualize o documento</p>
        <iframe
          src={`/api/assinatura/${token}/recibo`}
          className="h-100 w-full rounded-lg border border-border bg-white"
          title="Recibo e Autorização"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          Assinatura de <span className="font-bold">{clienteNome}</span>
        </p>
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4">
          <canvas
            ref={canvasRef}
            width={450}
            height={120}
            className="w-full max-w-112.5 max-h-30 cursor-crosshair touch-none rounded border border-border bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={(e) => {
              e.preventDefault();
              draw(e);
            }}
            onTouchEnd={stopDrawing}
          />
          <div className="mt-2 flex items-center gap-2">
            <Pen className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Desenhe sua assinatura na área acima (toque ou arraste com o mouse)
            </span>
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-error-text">{error}</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearCanvas}
            disabled={isSubmitting}
          >
            Limpar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasDrawn}
          >
            {isSubmitting ? "Enviando..." : "Confirmar e assinar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
