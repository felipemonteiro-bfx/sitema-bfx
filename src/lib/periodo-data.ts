/**
 * Limites de um período `YYYY-MM-DD` escolhido na tela, em UTC.
 *
 * Por que UTC e não horário local: as vendas sao gravadas com `new Date("YYYY-MM-DD")`,
 * e a spec do JS trata string date-only como UTC — entao `dataVenda` e sempre
 * meia-noite UTC. O `/historico` montava os limites com `new Date(y, m-1, d)`, que e
 * horario LOCAL: rodando em America/Manaus (UTC-4) a janela inteira andava um dia,
 * o primeiro dia escolhido sumia e o dia seguinte ao final aparecia. Pior, o campo
 * "Data final" era reexibido com `end.toISOString()`, entao cada clique em Filtrar
 * empurrava o filtro mais um dia para a frente.
 *
 * O fim e EXCLUSIVO (início do dia seguinte, para usar com `lt`), mesmo contrato que
 * `/dashboard` e `/financeiro` ja adotam — evita depender de 23:59:59.999 e da
 * precisao de milissegundo do banco.
 */

export interface PeriodoUtc {
  /** Inicio do primeiro dia, inclusivo (usar com `gte`). */
  inicio: Date;
  /** Inicio do dia seguinte ao ultimo, EXCLUSIVO (usar com `lt`). */
  fimExclusivo: Date;
}

/** Converte "YYYY-MM-DD" em partes numericas; devolve null se o formato nao bater. */
function partes(dateStr: string | null | undefined): { ano: number; mes: number; dia: number } | null {
  if (!dateStr) return null;
  const p = dateStr.split("-");
  if (p.length !== 3) return null;
  const ano = Number(p[0]);
  const mes = Number(p[1]);
  const dia = Number(p[2]);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  if (ano < 1000 || ano > 9999 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { ano, mes, dia };
}

/** Inicio do dia, em UTC. Null quando a string nao e uma data valida. */
export function inicioDoDiaUtc(dateStr: string | null | undefined): Date | null {
  const p = partes(dateStr);
  if (!p) return null;
  return new Date(Date.UTC(p.ano, p.mes - 1, p.dia, 0, 0, 0, 0));
}

/** Inicio do dia SEGUINTE, em UTC — o limite exclusivo do fim do periodo. */
export function fimExclusivoUtc(dateStr: string | null | undefined): Date | null {
  const p = partes(dateStr);
  if (!p) return null;
  return new Date(Date.UTC(p.ano, p.mes - 1, p.dia + 1, 0, 0, 0, 0));
}

/**
 * Formata um Date de volta para "YYYY-MM-DD" em UTC, para reexibir no input.
 *
 * Usar `toISOString()` direto sobre o fim exclusivo mostraria o dia seguinte — era
 * essa a origem do "a data final anda sozinha a cada clique".
 */
export function paraInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** O ultimo dia INCLUSIVO do periodo, para reexibir no campo "Data final". */
export function fimInclusivoParaInput(fimExclusivo: Date): string {
  const anterior = new Date(fimExclusivo.getTime() - 24 * 60 * 60 * 1000);
  return paraInputDate(anterior);
}

/**
 * Resolve o periodo a partir dos parametros da URL, caindo no mes corrente quando
 * ausentes ou invalidos. O default tambem e calculado em UTC — antes usava
 * `getFullYear()/getMonth()`, que no fim do mes em fuso negativo apontava para o
 * mes errado.
 */
export function resolverPeriodo(
  from: string | null | undefined,
  to: string | null | undefined,
  agora: Date = new Date()
): PeriodoUtc {
  const inicio =
    inicioDoDiaUtc(from) ??
    new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1, 0, 0, 0, 0));

  const fimExclusivo =
    fimExclusivoUtc(to) ??
    new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1, 0, 0, 0, 0));

  return { inicio, fimExclusivo };
}
