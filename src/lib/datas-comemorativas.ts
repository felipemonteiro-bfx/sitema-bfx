/**
 * Tabela das datas comemorativas fixas do BFX e resolução da data de hoje.
 *
 * Só datas FIXAS no calendário (dia/mês). Datas móveis (Dia das Mães, Black
 * Friday) e Páscoa estão fora de escopo. `dataComemorativaDeHoje` recebe a data
 * por parâmetro para ser testável sem relógio real.
 */
import { TEMPLATES } from "@/lib/whatsapp-templates";

export type DataComemorativa = {
  slug: string;
  dia: number;
  mes: number; // 1-12
  ocasiao: string;
  template: string;
};

export const DATAS_COMEMORATIVAS: DataComemorativa[] = [
  { slug: "ano_novo", dia: 1, mes: 1, ocasiao: "Feliz Ano Novo", template: TEMPLATES.anoNovo },
  { slug: "dia_mulheres", dia: 8, mes: 3, ocasiao: "Dia Internacional da Mulher", template: TEMPLATES.diaMulheres },
  { slug: "dia_namorados", dia: 12, mes: 6, ocasiao: "Dia dos Namorados", template: TEMPLATES.diaNamorados },
  { slug: "dia_cliente", dia: 15, mes: 9, ocasiao: "Dia do Cliente", template: TEMPLATES.diaCliente },
  { slug: "dia_criancas", dia: 12, mes: 10, ocasiao: "Dia das Crianças", template: TEMPLATES.diaCriancas },
  { slug: "natal", dia: 25, mes: 12, ocasiao: "Feliz Natal", template: TEMPLATES.natal },
];

/** Devolve a data comemorativa que casa com `hoje`, ou null. */
export function dataComemorativaDeHoje(hoje: Date): DataComemorativa | null {
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  return DATAS_COMEMORATIVAS.find((d) => d.dia === dia && d.mes === mes) ?? null;
}
