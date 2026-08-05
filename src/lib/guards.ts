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

/**
 * Exige apenas um usuario autenticado, de qualquer perfil.
 *
 * Para Server Action que o vendedor precisa executar no dia a dia — cadastrar e
 * editar cliente e produto. Nao basta deixar sem guarda: sem sessao a action
 * ainda seria invocavel, porque o Action ID vive no bundle servido
 * estaticamente e o guard do layout so roda no render, depois da action.
 */
export async function requireSessionOrThrow(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Nao autenticado.");
  return session;
}
