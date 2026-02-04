"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        type="button"
        className="w-full justify-start border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <LogOut />
        </span>
        Sair
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[92vw] max-w-sm gap-4 rounded-2xl border-border/70 p-5 sm:max-w-md sm:p-6">
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>{"Sair do sistema"}</DialogTitle>
              <DialogDescription>
                {"Você tem certeza que deseja encerrar a sessão? Essa ação vai desconectar seu usuário."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              type="button"
              className="h-10 w-full"
            >
              {"Cancelar"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              type="button"
              disabled={loading}
              className="h-10 w-full"
            >
              {loading ? "Saindo..." : "Sair agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
