"use client";

import { useFormStatus } from "react-dom";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function SettingsSaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className={cn(buttonVariants(), "cursor-pointer")}>{pending ? "Salvando configurações…" : "Salvar configurações"}</button>;
}
