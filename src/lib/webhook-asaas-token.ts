import { randomBytes } from "crypto";

/**
 * Token do header `asaas-access-token`: 48 caracteres base64url aleatórios. Evita três caracteres
 * iguais seguidos, que alguns validadores de token recusam.
 */
export function gerarTokenWebhook(): string {
  for (;;) {
    const token = randomBytes(36).toString("base64url").slice(0, 48);
    let repete = false;
    for (let i = 2; i < token.length; i++) {
      if (token[i] === token[i - 1] && token[i] === token[i - 2]) {
        repete = true;
        break;
      }
    }
    if (!repete) return token;
  }
}

/** Só os 4 últimos caracteres à vista. */
export function mascararToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return `${"•".repeat(Math.max(0, token.length - 4))}${token.slice(-4)}`;
}

export type StatusWebhookAsaas = "sem_token" | "falta_cadastrar" | "recebendo";

export function statusWebhookAsaas(cfg: { token: string | null; ultimoAvisoEm: Date | null }): StatusWebhookAsaas {
  if (!cfg.token) return "sem_token";
  return cfg.ultimoAvisoEm ? "recebendo" : "falta_cadastrar";
}

/**
 * URL para cadastrar no Asaas. Sem endereço configurado usa o host da requisição, sempre em https
 * fora de localhost: atrás do proxy o `x-forwarded-proto` pode chegar como http, e o Asaas não
 * segue redirecionamento.
 */
export function urlWebhookAsaas(appUrl: string | undefined, host: string | null): string {
  const caminho = "/api/webhooks/asaas";
  const base = appUrl?.trim().replace(/\/+$/, "");
  if (base) return `${base}${caminho}`;
  if (!host) return caminho;
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}${caminho}`;
}

/** Momento do último aviso (timestamp real, não data pura) no fuso de Manaus. */
export function formatarUltimoAviso(quando: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(quando);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} às ${p("hour")}:${p("minute")}`;
}
