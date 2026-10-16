import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// O tailwind-merge v3 só conhece a escala padrão do Tailwind. As utilitárias do Vantage vêm do
// bloco `@theme` de globals.css e precisam ser registradas aqui, senão: `rounded-painel` não
// disputa com `rounded-lg`, e `text-titulo` é lido como COR e descarta o `text-foreground`.
// Manter em sincronia com `--radius-*`, `--text-*` e `--color-*` do `@theme`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // Raios nomeados (`rounded-shell|painel|interno|controle`).
      radius: ["shell", "painel", "interno", "controle"],
      // Escala de tamanho de fonte (`text-titulo`, `text-kpi`): grupo font-size, não cor.
      text: ["titulo", "kpi"],
      // Cores de superfície e de gráfico do redesign (bg-/text-/border-/ring-… dessas chaves).
      color: [
        "shell",
        "shell-borda",
        "painel-borda",
        "poco",
        "controle",
        "controle-ativo",
        "divisoria",
        "marca-tint",
        "marca-tint-texto",
        "texto-secundario",
        "hachura-traco",
        "hachura-fundo",
        "grafico-neutro",
        "grafico-trilha",
        "grafico-inativo",
        "vidro",
        "vidro-borda",
        "vidro-piso",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanStr(val?: string | null) {
  return (val || "").replace(/\D/g, "");
}

export function formatBRL(value?: number | null) {
  const v = value || 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export function formatDateBR(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function maskCpf(val?: string | null) {
  const v = cleanStr(val || "");
  if (v.length !== 11) return val || "";
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}

export function maskCnpj(val?: string | null) {
  const v = cleanStr(val || "");
  if (v.length !== 14) return val || "";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(
    8,
    12
  )}-${v.slice(12)}`;
}

export function maskTel(val?: string | null) {
  const v = cleanStr(val || "");
  if (v.length === 11) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length === 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return val || "";
}

export function maskCep(val?: string | null) {
  const v = cleanStr(val || "");
  if (v.length !== 8) return val || "";
  return `${v.slice(0, 5)}-${v.slice(5)}`;
}

/**
 * Calcula o primeiro vencimento do boleto/parcela pela regra da empresa do cliente
 * (`RegraEmpresa`, spec 2026-09-30 §3.1); default corte 20 / dia 10, o comportamento anterior:
 * - Compra até o dia de corte → dia de vencimento do próximo mês
 * - Compra após o dia de corte → dia de vencimento do mês subsequente (dois meses à frente)
 *
 * Tipo inline para `utils.ts` não depender de `@/lib/regra-empresa`. Os dias da regra vão de
 * 1 a 28, então o `Date.UTC` nunca transborda para o mês seguinte.
 */
export function calcularPrimeiroVencimento(
  dataCompra: Date,
  regra: { diaCorte: number; diaVencimento: number } = { diaCorte: 20, diaVencimento: 10 }
): Date {
  // Use UTC methods to avoid timezone offset affecting the day-of-month check
  const dia = dataCompra.getUTCDate();
  const mesesAFrente = dia <= regra.diaCorte ? 1 : 2;
  return new Date(Date.UTC(dataCompra.getUTCFullYear(), dataCompra.getUTCMonth() + mesesAFrente, regra.diaVencimento));
}

export function sugerirNcm(nome?: string | null) {
  if (!nome) return "";
  const n = nome.toLowerCase();
  const ncms: Record<string, string> = {
    celular: "8517.12.31",
    iphone: "8517.12.31",
    smartphone: "8517.12.31",
    carregador: "8504.40.10",
    cabo: "8544.42.00",
    fone: "8518.30.00",
    airpods: "8518.30.00",
    tv: "8528.72.00",
    televisor: "8528.72.00",
    notebook: "8471.30.12",
    macbook: "8471.30.12",
    tablet: "8471.30.11",
    ipad: "8471.30.11",
    capa: "3926.90.90",
    pelicula: "3919.90.00",
    smartwatch: "8517.62.77",
    "apple watch": "8517.62.77",
    alexa: "8518.22.00",
  };
  for (const key of Object.keys(ncms)) {
    if (n.includes(key)) return ncms[key];
  }
  return "";
}
