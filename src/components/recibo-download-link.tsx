"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

type ReciboDownloadLinkProps = {
  vendaId: number;
  tipo?: "venda" | "autorizacao";
  /** Aparência do botão. Padrão: texto discreto (link). Telas de ação usam `outline`/`ghost` + `sm`. */
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Só layout (margem, largura, altura mínima). */
  className?: string;
  children?: React.ReactNode;
  /** Label do botão (default: "PDF" ou "Recibo" conforme tipo) */
  label?: string;
};

/**
 * Download de recibo via fetch para garantir que o arquivo seja salvo como PDF
 * (evita que o browser salve como .txt por falha no Content-Type ou proxy)
 */
export function ReciboDownloadLink({
  vendaId,
  tipo = "venda",
  variant = "discretoPlano",
  size = "inlineXs",
  className,
  children,
  label = tipo === "autorizacao" ? "Autorização" : "PDF",
}: ReciboDownloadLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const url = `/api/recibo?id=${vendaId}${tipo === "autorizacao" ? "&tipo=autorizacao" : ""}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        let msg: string;
        if (ct.includes("application/json")) {
          const data = await res.json();
          msg = data?.error ?? `Erro ${res.status}`;
        } else {
          msg = (await res.text()) || `Erro ${res.status}`;
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (blob.type !== "application/pdf") {
        throw new Error("Resposta não é PDF. Verifique a autenticação.");
      }

      const filename = `recibo_${tipo === "autorizacao" ? "autorizacao_" : ""}${vendaId}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar recibo");
      console.error("Erro ao baixar recibo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={className}
        title={`Baixar recibo em PDF${tipo === "autorizacao" ? " (Autorização)" : ""}`}
      >
        {loading ? "Baixando..." : children ?? label}
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
