/** Tipos e rótulos do histórico de e-mails — módulo puro, usado também no client. */
export type TipoEmail = "termo" | "semanal" | "mensal" | "venda" | "fechamento";
export type OrigemEmail = "automatico" | "manual";

export const TIPOS_EMAIL: TipoEmail[] = ["termo", "semanal", "mensal", "venda", "fechamento"];

export const ROTULO_TIPO_EMAIL: Record<TipoEmail, string> = {
  termo: "Termo assinado",
  semanal: "Consolidado semanal",
  mensal: "Relatório mensal",
  venda: "Aviso de venda",
  fechamento: "Demonstrativo mensal",
};

export function rotuloTipoEmail(tipo: string): string {
  return ROTULO_TIPO_EMAIL[tipo as TipoEmail] ?? tipo;
}

/** Tela de e-mails enviados, já filtrada pela empresa quando houver. */
export function linkHistoricoEmails(empresaId?: number | null): string {
  return empresaId ? `/relatorios/emails?empresa=${empresaId}` : "/relatorios/emails";
}

/** 12345 → "12 KB". */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
