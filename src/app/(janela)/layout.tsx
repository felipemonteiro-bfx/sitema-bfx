import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Layout das telas próprias abertas em nova janela (WhatsApp BFX).
 *
 * Fica fora do grupo `(app)` de propósito: aquele layout sempre monta a sidebar e a casca do
 * sistema. Aqui só se exige sessão; a regra de perfil (admin) continua em cada `page.tsx`.
 */
export default async function JanelaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
}
