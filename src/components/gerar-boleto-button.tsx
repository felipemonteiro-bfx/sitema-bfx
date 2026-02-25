"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import type { GerarBoletoResult } from "@/lib/boleto-actions";

type Props = {
  vendaId: number;
  gerarBoletoAction: (formData: FormData) => Promise<GerarBoletoResult>;
  className?: string;
  children?: React.ReactNode;
};

export function GerarBoletoButton({
  vendaId,
  gerarBoletoAction,
  className,
  children = "Gerar boleto Asaas",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("vendaId", String(vendaId));
      const result = await gerarBoletoAction(formData);
      if (result.success) {
        toast.success("Boleto gerado com sucesso!");
        router.refresh();
      } else {
        toast.error(result.error || "Falha ao gerar boleto.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao gerar boleto.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      {loading ? "Gerando..." : children}
    </button>
  );
}
