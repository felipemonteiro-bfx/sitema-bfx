import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import CommissionsDashboardClient from "@/components/commissions-dashboard-client";

export default async function Page() {
  const session = await getSession(); // Garantir que está autenticado

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nomeExibicao: "asc" },
    select: { nomeExibicao: true, username: true },
  });
  const isAdmin = session?.role === "admin";
  const vendedores = isAdmin
    ? usuarios.map((u) => u.nomeExibicao).filter((n): n is string => Boolean(n))
    : [session?.nomeExibicao || session?.username || ""].filter(Boolean);

  return <CommissionsDashboardClient vendedores={vendedores} />;
}
