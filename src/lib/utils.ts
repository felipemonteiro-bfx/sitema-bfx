import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
