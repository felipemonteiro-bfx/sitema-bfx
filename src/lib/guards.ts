import { getSession, type SessionPayload } from "@/lib/session";

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return false;
  }
  return true;
}

export async function requireAdminOrThrow(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Nao autenticado.");
  if (session.role !== "admin") throw new Error("Acesso negado. Requer perfil admin.");
  return session;
}
