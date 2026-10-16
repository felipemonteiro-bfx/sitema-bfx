"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, ShieldAlert } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        type="button"
        /* Este botao so existe DENTRO da sidebar (layout.tsx e o unico call
           site), e a sidebar passou a acompanhar o tema. `--destructive` foi
           calibrado para 4.69:1 sobre `--background` (0.985); a sidebar clara
           e 0.965, mais escura, e ali ele caia para 4.44:1 puro, 4.07:1 sobre
           o tint `/5` e 3.73:1 no hover `/10` — abaixo do minimo, no proprio
           componente que motivou a mudanca.

           A correcao usa a variante de TEXTO (`--error-text`, que existe desde
           a fase 17 exatamente para isso) e troca os tints compostos pelo
           opaco `--error-bg`: 5.17:1 sobre a sidebar e 4.66:1 sobre o tint no
           claro; 5.66:1 e 5.65:1 no escuro. Redesign Vantage: 44px de alvo
           (`min-h-11`), `rounded-controle` e a borda decorativa `--divisoria`, a
           mesma dos controles do topo — o rotulo "Sair" em texto de 4.5:1+ e
           quem identifica o botao, a borda nao carrega informacao. */
        className="min-h-11 w-full justify-between rounded-controle border border-divisoria bg-transparent px-3 py-2 text-error-text transition-colors hover:border-error hover:bg-error-bg hover:text-error-text"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error-bg text-error-text">
            <LogOut className="h-4 w-4" />
          </span>
          Sair
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="gap-2">
            {/* Mesmo par do botao, pelo mesmo motivo — aqui o fundo e o
                `--popover`, nao a sidebar: `text-destructive` sobre
                `bg-destructive/10` da 4.04:1 no claro, o caso exato que fez
                `--error-text` existir. Com o tint opaco: 4.66:1 / 5.24:1. */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error-text">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Confirmar saída</DialogTitle>
            <DialogDescription className="text-center">
              Você tem certeza que deseja sair? Será necessário fazer login novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={isLoading}>
              {isLoading ? "Saindo..." : "Sair agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
