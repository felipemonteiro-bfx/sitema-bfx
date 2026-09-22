const STATUS_LABELS: Record<string, string> = {
  enviado: "Enviado",
  falhou: "Falhou",
  sem_email: "Sem e-mail do RH",
};

export function obterEstadoTermoAssinado(
  assinaturaStatus: string | null | undefined,
  termoEmailStatus: string | null | undefined,
) {
  const mostrarReenvio = assinaturaStatus === "assinado";

  return {
    mostrarReenvio,
    statusLabel: mostrarReenvio ? STATUS_LABELS[termoEmailStatus ?? ""] ?? null : null,
  };
}
