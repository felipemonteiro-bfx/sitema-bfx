import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import { formaDaVenda, type VendaRelatorioMensal } from "@/lib/relatorio-mensal";
import { valorTotalVenda } from "@/lib/venda-utils";

type ClienteRelatorioProduto = {
  id: number;
  nome?: string | null;
  cpf?: string | null;
  matricula?: string | null;
  empresa?: string | null;
};

export type VendaRelatorioProduto = Omit<VendaRelatorioMensal, "cliente"> & {
  produtoNome?: string | null;
  cliente?: ClienteRelatorioProduto | null;
};

export type LinhaProdutoRelatorio = {
  clienteId: number;
  nome: string;
  cpf: string;
  matricula: string;
  empresa: string;
  dataCompra: string;
  produto: string;
  valorAcumulado: number;
  parcela: string;
  dataDesconto: string;
};

export type ConsolidadoProdutosRelatorio = {
  linhas: LinhaProdutoRelatorio[];
  totalFuncionarios: number;
  totalProdutos: number;
  totalDesconto: number;
};

type GrupoProduto = Omit<LinhaProdutoRelatorio, "dataCompra" | "valorAcumulado" | "parcela" | "dataDesconto"> & {
  chaveFuncionario: string;
  centavos: number;
  datasCompra: Set<string>;
  parcelas: Set<string>;
  datasDesconto: Set<string>;
};

const comparar = new Intl.Collator("pt-BR", { sensitivity: "base" }).compare;

function texto(valor: string | null | undefined, fallback = ""): string {
  return valor?.trim().replace(/\s+/g, " ") || fallback;
}

function normalizar(valor: string): string {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function somenteDigitos(valor: string | null | undefined): string {
  return valor?.replace(/\D/g, "") ?? "";
}

function dataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function distribuirCentavos(total: number, pesos: number[]): number[] {
  if (pesos.length === 1) return [total];
  const pesosValidos = pesos.map((peso) => Math.max(0, peso));
  const somaPesos = pesosValidos.reduce((soma, peso) => soma + peso, 0);
  const base = somaPesos > 0 ? pesosValidos : pesosValidos.map(() => 1);
  const divisor = base.reduce((soma, peso) => soma + peso, 0);
  let distribuido = 0;

  return base.map((peso, indice) => {
    if (indice === base.length - 1) return total - distribuido;
    const centavos = Math.floor((total * peso) / divisor);
    distribuido += centavos;
    return centavos;
  });
}

function detalhesParcelas(venda: VendaRelatorioProduto): {
  totalCentavos: number;
  rotulos: string[];
  datas: string[];
} {
  const parcelas = [...(venda.parcelasVencimento ?? [])].sort(
    (a, b) => a.numeroParcela - b.numeroParcela
  );

  if (parcelas.length > 0) {
    return {
      totalCentavos: parcelas.reduce(
        (soma, parcela) => soma + Math.round(parcela.valorParcela * 100),
        0
      ),
      rotulos: parcelas.map((parcela) => `${parcela.numeroParcela}/${parcelas.length}`),
      datas: parcelas.map((parcela) => dataIso(parcela.dataVencimento)),
    };
  }

  const quantidade = Math.max(1, venda.parcelas ?? 1);
  return {
    totalCentavos: Math.round(valorTotalVenda(venda) * 100),
    rotulos: Array.from({ length: quantidade }, (_, indice) => `${indice + 1}/${quantidade}`),
    datas: [],
  };
}

export function consolidarProdutosRelatorio(
  vendas: VendaRelatorioMensal[],
  inicio: Date,
  fim: Date
): ConsolidadoProdutosRelatorio {
  const grupos = new Map<string, GrupoProduto>();
  const ordenadas = [...(vendas as VendaRelatorioProduto[])].sort(
    (a, b) => a.dataVenda.getTime() - b.dataVenda.getTime() || a.id - b.id
  );

  for (const venda of ordenadas) {
    if (venda.dataVenda < inicio || venda.dataVenda > fim) continue;
    if (formaDaVenda(venda) !== FORMA_PAGAMENTO.DESCONTO_FOLHA) continue;

    const cliente = venda.cliente;
    const cpfNormalizado = somenteDigitos(cliente?.cpf);
    const clienteId = cliente?.id ?? 0;
    const chaveFuncionario = cpfNormalizado ? `cpf:${cpfNormalizado}` : `id:${clienteId || `venda:${venda.id}`}`;
    const itens = (
      venda.itens?.length
        ? venda.itens.map((item) => ({ nome: texto(item.produtoNome, "—"), peso: item.subtotal }))
        : [{ nome: texto(venda.produtoNome, "—"), peso: valorTotalVenda(venda) }]
    ).sort((a, b) => comparar(normalizar(a.nome), normalizar(b.nome)));
    const detalhes = detalhesParcelas(venda);
    const valores = distribuirCentavos(detalhes.totalCentavos, itens.map((item) => item.peso));

    itens.forEach((item, indice) => {
      const chave = `${chaveFuncionario}|produto:${normalizar(item.nome)}`;
      const grupo = grupos.get(chave) ?? {
        chaveFuncionario,
        clienteId,
        nome: texto(cliente?.nome, "SEM NOME"),
        cpf: texto(cliente?.cpf),
        matricula: texto(cliente?.matricula),
        empresa: texto(cliente?.empresa),
        produto: item.nome,
        centavos: 0,
        datasCompra: new Set<string>(),
        parcelas: new Set<string>(),
        datasDesconto: new Set<string>(),
      };

      grupo.centavos += valores[indice] ?? 0;
      grupo.datasCompra.add(dataIso(venda.dataVenda));
      detalhes.rotulos.forEach((rotulo) => grupo.parcelas.add(rotulo));
      detalhes.datas.forEach((data) => grupo.datasDesconto.add(data));
      grupos.set(chave, grupo);
    });
  }

  const funcionarios = new Set<string>();
  const linhas = [...grupos.values()]
    .map((grupo): LinhaProdutoRelatorio => {
      funcionarios.add(grupo.chaveFuncionario);
      return {
        clienteId: grupo.clienteId,
        nome: grupo.nome,
        cpf: grupo.cpf,
        matricula: grupo.matricula,
        empresa: grupo.empresa,
        dataCompra: [...grupo.datasCompra].sort().map(formatarData).join(", "),
        produto: grupo.produto,
        valorAcumulado: grupo.centavos / 100,
        parcela: [...grupo.parcelas].sort(comparar).join(", "),
        dataDesconto: [...grupo.datasDesconto].sort().map(formatarData).join(", "),
      };
    })
    .sort((a, b) => comparar(a.nome, b.nome) || comparar(a.produto, b.produto) || a.clienteId - b.clienteId);

  return {
    linhas,
    totalFuncionarios: funcionarios.size,
    totalProdutos: linhas.length,
    totalDesconto: [...grupos.values()].reduce((soma, grupo) => soma + grupo.centavos, 0) / 100,
  };
}
