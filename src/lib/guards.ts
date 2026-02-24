import { getSession } from "@/lib/session";

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return false;
  }
  return true;
}
