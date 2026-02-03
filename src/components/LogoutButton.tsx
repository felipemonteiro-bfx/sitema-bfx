"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const ok = window.confirm("Tem certeza que deseja sair?");
    if (!ok) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="destructive" onClick={handleLogout} type="button">
      <LogOut />
      Sair
    </Button>
  );
}
