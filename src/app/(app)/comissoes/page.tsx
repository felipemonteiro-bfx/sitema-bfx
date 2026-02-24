import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import CommissionsDashboardClient from "@/components/commissions-dashboard-client";

export default async function Page() {
  await getSession(); // Garantir que está autenticado

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nomeExibicao: "asc" },
    select: { nomeExibicao: true },
  });
  const vendedores = usuarios
    .map((u) => u.nomeExibicao)
    .filter((n): n is string => Boolean(n));

  return <CommissionsDashboardClient vendedores={vendedores} />;
}
