/**
 * Antecipação por comprador e por mês: quanto já foi antecipado na Prudent e
 * quantas parcelas ainda faltam antecipar, com os totais gerais.
 *
 * Espelha o controle que a equipe mantinha em planilha (uma aba por mês de
 * desconto, status `ANTECIPAÇÃO OK` / `PENDENTE DE REPASSE` / `PAGO`). Puro e
 * sem banco, para ser testado direto.
 *
 * Cada parcela cai em exatamente um balde (`baldeDaParcela`, a regra única):
 *   - antecipada: flag da parcela, OU venda com o flag legado `antecipada = 1`.
 *     Medido em produção (2026-09-11): as 26 vendas marcadas assim tinham todas
 *     as parcelas com o flag em false — sem esta regra o resumo diria que nada
 *     foi antecipado, enquanto a fila mostra essas vendas como "Antecipado".
 *   - a antecipar: não antecipada e vence hoje ou depois.
 *   - vencida sem antecipar: não antecipada e já venceu. Fica fora do "falta
 *     antecipar" porque o desconto em folha já aconteceu. Não dá para chamar de
 *     "paga": `paga` nunca é gravado por nenhum fluxo do sistema. Atenção: a fila
 *     da Prudent ainda deixa selecionar essas parcelas — `titulosDeVenda` e a
 *     action `antecipar` não têm piso de data, e o prazo delas conta da data da
 *     venda, então entram no lote com taxa cheia. Por isso a tela mostra quantas
 *     vencidas cada venda e cada seleção carregam.
 *
 * Venda cancelada/estornada não entra em nada. Datas são data pura (meia-noite
 * UTC), comparadas por dia UTC; `hoje` vem de `hojeDataPura()`, o dia civil de
 * Manaus. Valores somados em centavos inteiros.
 */

export interface ParcelaParaResumo {
  numeroParcela?: number;
  dataVencimento: string | Date;
  valorParcela: number;
  antecipada?: boolean | null;
}

export type SituacaoParcela = "antecipada" | "a_antecipar" | "vencida";

export interface ParcelaDetalhada {
  numero: number;
  vencimento: string;
  valor: number;
  situacao: SituacaoParcela;
}

export interface ParcelasDaVenda {
  dataCompra: string;
  quantidade: number;
  valorParcela: number | null;
  contagem: { antecipadas: number; aAntecipar: number; vencidas: number };
  lista: ParcelaDetalhada[];
  totais: { antecipado: number; faltaAntecipar: number };
  /** Venda cancelada ou estornada: lista vazia, e a tela diz por quê. */
  desfeita: boolean;
}

/**
 * Parcelas de uma venda para o popover da fila, calculadas no servidor: a
 * situação de cada uma (a mesma regra do resumo, `baldeDaParcela`), as
 * contagens e os totais em centavos. Ordena pelo número da parcela; sem número
 * gravado, pelo vencimento. Venda desfeita não tem nada a antecipar.
 */
export function parcelasDaVenda(venda: VendaParaResumo & { dataVenda: string | Date }, hoje: string): ParcelasDaVenda {
  const hojeDia = diaUtc(hoje);
  const diaCompra = diaUtc(venda.dataVenda);
  const dataCompra = Number.isFinite(diaCompra) ? dataDoDia(diaCompra) : "";
  const parcelas = venda.parcelas_detalhes ?? [];
  const contagem = { antecipadas: 0, aAntecipar: 0, vencidas: 0 };
  const desfeita = vendaDesfeita(venda);
  const base = { dataCompra, quantidade: parcelas.length, valorParcela: valorUnicoDasParcelas(parcelas), desfeita };

  if (desfeita) {
    return { ...base, contagem, lista: [], totais: { antecipado: 0, faltaAntecipar: 0 } };
  }

  const vendaAntecipada = venda.antecipada === 1;
  let antecipado = 0;
  let falta = 0;
  const lista = parcelas
    .map((p) => ({ p, dia: diaUtc(p.dataVencimento) }))
    .filter(({ dia }) => Number.isFinite(dia))
    .sort((a, b) => (a.p.numeroParcela ?? 0) - (b.p.numeroParcela ?? 0) || a.dia - b.dia)
    .map(({ p, dia }, i): ParcelaDetalhada => {
      const tipo = baldeDaParcela(vendaAntecipada, p, dia, hojeDia);
      const situacao: SituacaoParcela = tipo === "antecipadas" ? "antecipada" : tipo === "aAntecipar" ? "a_antecipar" : "vencida";
      const c = paraCentavos(p.valorParcela);
      if (situacao === "antecipada") {
        contagem.antecipadas += 1;
        antecipado += c;
      } else if (situacao === "a_antecipar") {
        contagem.aAntecipar += 1;
        falta += c;
      } else {
        contagem.vencidas += 1;
      }
      return { numero: p.numeroParcela ?? i + 1, vencimento: dataDoDia(dia), valor: c / 100, situacao };
    });

  return { ...base, contagem, lista, totais: { antecipado: antecipado / 100, faltaAntecipar: falta / 100 } };
}

/** Valor da parcela quando todas são iguais; `null` quando variam (ou não há parcela). */
function valorUnicoDasParcelas(parcelas: ParcelaParaResumo[]): number | null {
  if (parcelas.length === 0) return null;
  const primeira = paraCentavos(parcelas[0].valorParcela);
  return parcelas.every((p) => paraCentavos(p.valorParcela) === primeira) ? primeira / 100 : null;
}

export interface VendaParaResumo {
  id: number;
  status?: string | null;
  /** Flag legado da venda: 0 pendente, 1 antecipada, 2 em andamento, 3 parcial. */
  antecipada?: number | null;
  clienteId: number | null;
  clienteNome: string | null;
  empresa: string | null;
  parcelas_detalhes: ParcelaParaResumo[];
}

export interface Contagem {
  qtd: number;
  valor: number;
}

export interface ContagemAAntecipar extends Contagem {
  /** Vencimento mais próximo entre as parcelas a antecipar (YYYY-MM-DD). */
  proximoVencimento: string | null;
}

export interface SituacaoParcelas {
  antecipadas: Contagem;
  aAntecipar: ContagemAAntecipar;
  vencidasSemAntecipar: Contagem;
  semParcelas: boolean;
}

export interface CompradorAntecipacao {
  /** `c<clienteId>`, ou `v<vendaId>` para venda sem cliente. */
  chave: string;
  clienteId: number | null;
  nome: string;
  empresa: string | null;
  vendas: number;
  vendasSemParcelas: number;
  antecipadas: Contagem;
  aAntecipar: ContagemAAntecipar;
  vencidasSemAntecipar: Contagem;
}

export interface ResumoAntecipacaoCompradores {
  compradores: CompradorAntecipacao[];
  totais: {
    antecipadas: Contagem;
    aAntecipar: Contagem;
    vencidasSemAntecipar: Contagem;
    compradores: number;
    compradoresComPendencia: number;
    vendasSemParcelas: number;
  };
}

export interface MesAntecipacao {
  /** Mês do vencimento, `YYYY-MM`. */
  mes: string;
  antecipadas: Contagem;
  aAntecipar: Contagem;
  vencidasSemAntecipar: Contagem;
}

/** Mesmo recorte de `finance.ts`: venda desfeita não gera parcela a receber. */
const STATUS_FORA = new Set(["cancelada", "estornada"]);

const MS_POR_DIA = 24 * 60 * 60 * 1000;

interface Balde {
  qtd: number;
  centavos: number;
}

type TipoBalde = "antecipadas" | "aAntecipar" | "vencidas";

interface Classificacao {
  antecipadas: Balde;
  aAntecipar: Balde;
  vencidas: Balde;
  proximoDia: number | null;
  semParcelas: boolean;
}

const baldeVazio = (): Balde => ({ qtd: 0, centavos: 0 });

const vendaDesfeita = (venda: VendaParaResumo) => STATUS_FORA.has(venda.status ?? "");

function somar(balde: Balde, centavos: number) {
  balde.qtd += 1;
  balde.centavos += centavos;
}

function juntar(destino: Balde, origem: Balde) {
  destino.qtd += origem.qtd;
  destino.centavos += origem.centavos;
}

const contagem = (b: Balde): Contagem => ({ qtd: b.qtd, valor: b.centavos / 100 });

function paraCentavos(valor: number): number {
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
}

/** Número do dia em UTC, descartando a hora; NaN para data ilegível. */
function diaUtc(valor: string | Date): number {
  const d = valor instanceof Date ? valor : new Date(valor);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return Number.NaN;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_POR_DIA;
}

const dataDoDia = (dia: number): string => new Date(dia * MS_POR_DIA).toISOString().slice(0, 10);

/**
 * A regra única: em que balde cai uma parcela. `null` quando o vencimento é
 * ilegível e a parcela não está antecipada — chutar um balde para ela
 * inventaria pendência ou atraso (mesma regra de `titulosDeVenda`).
 */
function baldeDaParcela(
  vendaAntecipada: boolean,
  parcela: ParcelaParaResumo,
  dia: number,
  hojeDia: number
): TipoBalde | null {
  // Antecipada não depende do vencimento: o valor já foi recebido da Prudent.
  if (vendaAntecipada || parcela.antecipada) return "antecipadas";
  if (!Number.isFinite(dia)) return null;
  return dia >= hojeDia ? "aAntecipar" : "vencidas";
}

function classificar(venda: VendaParaResumo, hojeDia: number): Classificacao {
  const vendaAntecipada = venda.antecipada === 1;
  const c: Classificacao = {
    antecipadas: baldeVazio(),
    aAntecipar: baldeVazio(),
    vencidas: baldeVazio(),
    proximoDia: null,
    // Venda legada já antecipada não precisa de parcela para nada: pedir o
    // cadastro dela seria um aviso falso ao lado de um "Antecipado" na fila.
    semParcelas: (venda.parcelas_detalhes?.length ?? 0) === 0 && !vendaAntecipada,
  };

  for (const p of venda.parcelas_detalhes ?? []) {
    const dia = diaUtc(p.dataVencimento);
    const tipo = baldeDaParcela(vendaAntecipada, p, dia, hojeDia);
    if (!tipo) continue;
    somar(c[tipo], paraCentavos(p.valorParcela));
    if (tipo === "aAntecipar" && (c.proximoDia === null || dia < c.proximoDia)) c.proximoDia = dia;
  }
  return c;
}

/**
 * Chave do comprador: o cliente; venda sem cliente vira comprador próprio.
 * A fila usa a mesma chave para filtrar pelo comprador escolhido no resumo.
 */
export function chaveComprador(venda: { id: number; clienteId: number | null }): string {
  return venda.clienteId != null ? `c${venda.clienteId}` : `v${venda.id}`;
}

/**
 * Em que pé está a antecipação das parcelas de uma venda. Venda desfeita volta
 * zerada: a fila chama esta função direto, sem o filtro do resumo.
 */
export function situacaoParcelasVenda(venda: VendaParaResumo, hoje: string): SituacaoParcelas {
  const c = vendaDesfeita(venda)
    ? { antecipadas: baldeVazio(), aAntecipar: baldeVazio(), vencidas: baldeVazio(), proximoDia: null, semParcelas: false }
    : classificar(venda, diaUtc(hoje));
  return {
    antecipadas: contagem(c.antecipadas),
    aAntecipar: {
      ...contagem(c.aAntecipar),
      proximoVencimento: c.proximoDia === null ? null : dataDoDia(c.proximoDia),
    },
    vencidasSemAntecipar: contagem(c.vencidas),
    semParcelas: c.semParcelas,
  };
}

/**
 * Agrupa as vendas por comprador e soma os três baldes. Quem tem mais a
 * antecipar vem primeiro; empate, pelo nome.
 */
export function resumirAntecipacaoPorComprador(
  vendas: VendaParaResumo[],
  hoje: string
): ResumoAntecipacaoCompradores {
  const hojeDia = diaUtc(hoje);
  const grupos = new Map<
    string,
    Omit<Classificacao, "semParcelas"> & {
      clienteId: number | null;
      nome: string;
      empresa: string | null;
      vendas: number;
      vendasSemParcelas: number;
    }
  >();

  for (const venda of vendas) {
    if (vendaDesfeita(venda)) continue;
    const chave = chaveComprador(venda);
    const grupo = grupos.get(chave) ?? {
      clienteId: venda.clienteId,
      nome: venda.clienteNome || `Sem cliente (venda #${venda.id})`,
      empresa: venda.empresa,
      vendas: 0,
      vendasSemParcelas: 0,
      antecipadas: baldeVazio(),
      aAntecipar: baldeVazio(),
      vencidas: baldeVazio(),
      proximoDia: null,
    };

    const c = classificar(venda, hojeDia);
    grupo.vendas += 1;
    if (c.semParcelas) grupo.vendasSemParcelas += 1;
    juntar(grupo.antecipadas, c.antecipadas);
    juntar(grupo.aAntecipar, c.aAntecipar);
    juntar(grupo.vencidas, c.vencidas);
    if (c.proximoDia !== null && (grupo.proximoDia === null || c.proximoDia < grupo.proximoDia)) {
      grupo.proximoDia = c.proximoDia;
    }
    grupos.set(chave, grupo);
  }

  const ordenados = [...grupos.entries()].sort(
    ([, a], [, b]) => b.aAntecipar.centavos - a.aAntecipar.centavos || a.nome.localeCompare(b.nome, "pt-BR")
  );

  const total = { antecipadas: baldeVazio(), aAntecipar: baldeVazio(), vencidas: baldeVazio() };
  let compradoresComPendencia = 0;
  let vendasSemParcelas = 0;

  const compradores = ordenados.map(([chave, g]): CompradorAntecipacao => {
    juntar(total.antecipadas, g.antecipadas);
    juntar(total.aAntecipar, g.aAntecipar);
    juntar(total.vencidas, g.vencidas);
    if (g.aAntecipar.qtd > 0) compradoresComPendencia += 1;
    vendasSemParcelas += g.vendasSemParcelas;
    return {
      chave,
      clienteId: g.clienteId,
      nome: g.nome,
      empresa: g.empresa,
      vendas: g.vendas,
      vendasSemParcelas: g.vendasSemParcelas,
      antecipadas: contagem(g.antecipadas),
      aAntecipar: {
        ...contagem(g.aAntecipar),
        proximoVencimento: g.proximoDia === null ? null : dataDoDia(g.proximoDia),
      },
      vencidasSemAntecipar: contagem(g.vencidas),
    };
  });

  return {
    compradores,
    totais: {
      antecipadas: contagem(total.antecipadas),
      aAntecipar: contagem(total.aAntecipar),
      vencidasSemAntecipar: contagem(total.vencidas),
      compradores: compradores.length,
      compradoresComPendencia,
      vendasSemParcelas,
    },
  };
}

/**
 * Os mesmos três baldes, agrupados pelo mês do vencimento — as abas da
 * planilha, com uma diferença que a tela precisa explicar: a aba da planilha é
 * o mês do DESCONTO em folha, e aqui o mês é o do VENCIMENTO, que o sistema põe
 * no dia 10 do mês seguinte (`calcularPrimeiroVencimento`). Do mais antigo ao
 * mais novo. Parcela sem vencimento legível não tem mês e fica de fora, mesmo
 * antecipada.
 */
export function resumirAntecipacaoPorMes(vendas: VendaParaResumo[], hoje: string): MesAntecipacao[] {
  const hojeDia = diaUtc(hoje);
  const meses = new Map<string, Record<TipoBalde, Balde>>();

  for (const venda of vendas) {
    if (vendaDesfeita(venda)) continue;
    const vendaAntecipada = venda.antecipada === 1;
    for (const p of venda.parcelas_detalhes ?? []) {
      const dia = diaUtc(p.dataVencimento);
      if (!Number.isFinite(dia)) continue;
      const tipo = baldeDaParcela(vendaAntecipada, p, dia, hojeDia);
      if (!tipo) continue;
      const mes = dataDoDia(dia).slice(0, 7);
      const baldes = meses.get(mes) ?? { antecipadas: baldeVazio(), aAntecipar: baldeVazio(), vencidas: baldeVazio() };
      somar(baldes[tipo], paraCentavos(p.valorParcela));
      meses.set(mes, baldes);
    }
  }

  return [...meses.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([mes, b]) => ({
      mes,
      antecipadas: contagem(b.antecipadas),
      aAntecipar: contagem(b.aAntecipar),
      vencidasSemAntecipar: contagem(b.vencidas),
    }));
}
