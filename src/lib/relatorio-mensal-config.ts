export function validarDiaRelatorioMensal(value: unknown): number | null {
  if (value == null || value === "" || value === 0 || value === "0") {
    return null;
  }

  const dia = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error("O dia do relatório mensal deve ser um inteiro entre 1 e 31.");
  }

  return dia;
}

export function diaEfetivoRelatorioMensal(
  value: number | null | undefined,
  ultimoDiaDoMes = 31
): number {
  return Math.min(value ?? 1, ultimoDiaDoMes);
}
