"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        variant="destructive"
        onClick={() => setOpen(true)}
        type="button"
        className="w-full justify-start gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="gap-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
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
