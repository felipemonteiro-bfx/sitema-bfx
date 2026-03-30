import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const rawSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && (!rawSecret || rawSecret === "dev-secret")) {
  throw new Error("SESSION_SECRET nao configurado em producao. Defina uma chave com minimo 32 caracteres.");
}
const secret = new TextEncoder().encode(rawSecret || "dev-secret");

export type SessionPayload = {
  id: number;
  username: string;
  role: string;
  nomeExibicao?: string | null;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
