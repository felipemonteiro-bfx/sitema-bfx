import { SignJWT } from "jose";

/**
 * Assinador do token que o assistente interno do WhatsApp apresenta ao `mcp-bfx`
 * (`src/lib/mcp-agente.ts`, função `verificarToken`). Spec: `docs/MCP-AGENTE-SPEC.md`.
 *
 * Usa SÓ o `MCP_AGENTE_SECRET`. O segredo de sessão de usuário interno (que assina até admin)
 * nunca entra aqui. Sem segredo válido devolve `null` (falha fechada): o chamador cai no
 * atendimento determinístico.
 */
const AUDIENCIA = "mcp-bfx";
// Validade em segundos. `iat` e `exp` saem do MESMO instante: com `setIssuedAt()` e
// `setExpirationTime("5m")` cada um lia o relógio na sua vez, e a virada de segundo
// entre as duas leituras dava 301 s.
const VALIDADE_S = 300;

export async function assinarTokenMcp(telefone: string, nome?: string): Promise<string | null> {
  const bruto = process.env.MCP_AGENTE_SECRET;
  if (!bruto || bruto.length < 32 || !telefone) return null;
  const nomeLimpo = nome?.trim().slice(0, 60);
  const agora = Math.floor(Date.now() / 1000);
  return new SignJWT(nomeLimpo ? { nome: nomeLimpo } : {})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(telefone)
    .setAudience(AUDIENCIA)
    .setIssuedAt(agora)
    .setExpirationTime(agora + VALIDADE_S)
    .sign(new TextEncoder().encode(bruto));
}
