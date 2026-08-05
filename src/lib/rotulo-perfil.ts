/**
 * Rotulo legivel do perfil de um usuario.
 *
 * Existe como modulo proprio, e nao dentro de `delete-user-button.tsx`, porque
 * o componente e `"use client"` e arrasta React, Radix, sonner e
 * `next/navigation`. O vitest deste projeto roda com `environment: "node"` e
 * nenhum teste importa `.tsx` — manter a regra aqui e o que a torna testavel
 * sem DOM.
 *
 * O default e "Vendedor" para concordar com `u.role || "vendedor"`, que e o
 * default do select de perfil em `gestao-rh/page.tsx`.
 */
export function rotuloDoPerfil(role?: string | null): string {
  return role === "admin" ? "Administrador" : "Vendedor";
}
