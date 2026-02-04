import { getSession } from "@/lib/session";
import CommissionsDashboardClient from "@/components/commissions-dashboard-client";

export default async function Page() {
  await getSession(); // Garantir que está autenticado

  return <CommissionsDashboardClient />;
}
