"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gerarFechamento } from "@/app/(app)/fechamento/actions";

/** "Gerar" da grade: cria o fechamento da empresa na competência e abre o detalhe. */
export function FechamentoGerarButton({
  empresaParceiraId,
  competencia,
  rotulo,
}: {
  empresaParceiraId: number;
  competencia: string;
  rotulo: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pendente}
      aria-label={rotulo}
      onClick={() =>
        iniciar(async () => {
          try {
            const r = await gerarFechamento(empresaParceiraId, competencia);
            if (!r.ok) {
              toast.error(r.erro);
              return;
            }
            router.push(`/fechamento/${r.fechamentoId}`);
          } catch {
            toast.error("Não foi possível falar com o servidor. Confira a conexão e tente de novo.");
          }
        })
      }
    >
      {pendente ? "Gerando…" : "Gerar"}
    </Button>
  );
}
