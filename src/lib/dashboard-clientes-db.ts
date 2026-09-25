/**
 * Consultas do Dashboard para "clientes que compraram". Mesmo critério de venda
 * de `calcularMetricasPeriodo`: tudo que não foi cancelado nem estornado.
 */
import { prisma } from "@/lib/db";
import { contarClientes, periodoAnteriorComparavel, variacao } from "@/lib/dashboard-clientes";
import type { MesClientes } from "@/components/clientes-mes-a-mes";

const VALIDA = { not: { in: ["cancelada", "estornada"] } };

/** Venda sem cliente não conta como "cliente que comprou". */
function comCliente<T extends { clienteId: number | null }>(vendas: T[]): (T & { clienteId: number })[] {
  return vendas.filter((v): v is T & { clienteId: number } => v.clienteId != null);
}

async function primeiraCompra(ids: number[]): Promise<Map<number, Date>> {
  if (ids.length === 0) return new Map();
  const grupos = await prisma.venda.groupBy({
    by: ["clienteId"],
    where: { clienteId: { in: ids }, status: VALIDA },
    _min: { dataVenda: true },
  });
  return new Map(
    grupos
      .filter((g) => g.clienteId != null && g._min.dataVenda)
      .map((g) => [g.clienteId as number, g._min.dataVenda as Date])
  );
}

export async function clientesNoPeriodo(inicio: Date, fim: Date, vendedores?: string[]) {
  const vendas = comCliente(
    await prisma.venda.findMany({
      where: { dataVenda: { gte: inicio, lt: fim }, status: VALIDA, vendedor: vendedores ? { in: vendedores } : undefined },
      select: { clienteId: true },
    })
  );
  const primeira = await primeiraCompra([...new Set(vendas.map((v) => v.clienteId))]);
  return contarClientes(vendas, primeira, inicio, fim);
}

const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const MES_LONGO = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Últimos `meses` meses até `fimAtual` (exclusivo, início do dia seguinte a hoje).
 * O mês corrente compara com os mesmos dias do mês anterior.
 */
export async function serieMensalClientes(fimAtual: Date, meses = 6): Promise<MesClientes[]> {
  // Ano e mês da MESMA data (o último instante do período): em 31/12 o fim
  // exclusivo já é 1º de janeiro do ano seguinte.
  const ultimoInstante = new Date(fimAtual.getTime() - 1);
  const ano = ultimoInstante.getUTCFullYear();
  const mesAtual = ultimoInstante.getUTCMonth();
  const inicios = Array.from({ length: meses + 1 }, (_, i) => new Date(Date.UTC(ano, mesAtual - meses + i, 1)));
  // [0] é o mês antes da janela (só para comparar o primeiro); o último fim é hoje.
  const janela = { inicio: inicios[0], fim: fimAtual };

  const vendas = comCliente(
    await prisma.venda.findMany({
      where: { dataVenda: { gte: janela.inicio, lt: janela.fim }, status: VALIDA },
      select: { clienteId: true, dataVenda: true },
    })
  );
  const primeira = await primeiraCompra([...new Set(vendas.map((v) => v.clienteId))]);
  const noIntervalo = (i: Date, f: Date) => vendas.filter((v) => v.dataVenda >= i && v.dataVenda < f);

  const resultado: MesClientes[] = [];
  for (let k = 1; k <= meses; k++) {
    const inicio = inicios[k];
    const ehAtual = k === meses;
    const fim = ehAtual ? fimAtual : new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
    const doMes = noIntervalo(inicio, fim);
    const c = contarClientes(doMes, primeira, inicio, fim);

    const ant = ehAtual ? periodoAnteriorComparavel(inicio, fim) : { inicio: inicios[k - 1], fim: inicio };
    const cAnt = contarClientes(noIntervalo(ant.inicio, ant.fim), primeira, ant.inicio, ant.fim);
    const nomeAnt = MES_LONGO.format(ant.inicio).split(" de ")[0];
    const ultimoDia = new Date(fim.getTime() - 1).getUTCDate();

    resultado.push({
      mes: MES_CURTO.format(inicio).replace(".", ""),
      mesLongo: MES_LONGO.format(inicio).replace(" de ", "/"),
      total: c.total,
      novos: c.novos,
      recorrentes: c.recorrentes,
      vendas: doMes.length,
      variacao: {
        ...variacao(c.total, cAnt.total),
        base: ehAtual ? `os mesmos dias (1 a ${ultimoDia}) de ${nomeAnt}` : nomeAnt,
      },
    });
  }
  return resultado;
}
