import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardStats } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QueryTabs } from "@/components/query-tabs";
import { EstoqueEntradaForm } from "@/components/estoque-entrada-form";
import { EstoqueSaidaForm } from "@/components/estoque-saida-form";
import { registrarEntradaEstoque, registrarSaidaManual, registrarEntradaLote } from "./actions";
import {
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Clock,
} from "lucide-react";

type SearchParams = {
  tab?: string;
  q?: string;
  q_mov?: string;
};

export default async function EstoquePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;

  const sp = await searchParams;

  const produtos = await prisma.produto.findMany({
    where: sp.q ? {
      OR: [
        { nome: { contains: sp.q, mode: "insensitive" } },
        { marca: { contains: sp.q, mode: "insensitive" } },
        { categoria: { contains: sp.q, mode: "insensitive" } },
      ],
    } : {},
    include: { fornecedor: { select: { id: true, nome: true } } },
    orderBy: { nome: "asc" },
  });

  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });

  const movimentoWhere: Record<string, unknown> = {};
  if (sp.q_mov) {
    const produtoIds = await prisma.produto.findMany({
      where: { nome: { contains: sp.q_mov, mode: "insensitive" } },
      select: { id: true },
    });
    movimentoWhere.produtoId = { in: produtoIds.map((p) => p.id) };
  }

  const movimentos = await prisma.movimentoEstoque.findMany({
    where: movimentoWhere,
    include: { produto: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const totalProdutos = produtos.length;
  const totalEstoque = produtos.reduce((s, p) => s + (p.qtdEstoque ?? 0), 0);
  const valorEstoque = produtos.reduce((s, p) => s + (p.qtdEstoque ?? 0) * (p.custoPadrao ?? 0), 0);
  const produtosBaixoEstoque = produtos.filter(
    (p) => (p.qtdEstoque ?? 0) <= (p.estoqueMinimo ?? 5) && (p.qtdEstoque ?? 0) >= 0
  );
  const produtosZerados = produtos.filter((p) => (p.qtdEstoque ?? 0) === 0);

  const motivoLabel: Record<string, string> = {
    COMPRA_COM_NOTA: "Compra c/ Nota",
    COMPRA_SEM_NOTA: "Compra s/ Nota",
    VENDA: "Venda",
    AJUSTE: "Ajuste",
    DEVOLUCAO: "Devolução",
    PERDA: "Perda",
  };

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
          <Package className="h-6 w-6 text-primary dark:text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Controle de Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            Entrada e saída de mercadorias com rastreabilidade completa
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardStats
          title="Produtos Cadastrados"
          value={String(totalProdutos)}
          description={`${produtosZerados.length} sem estoque`}
          icon={Package}
          color="info"
          className="stagger-1"
        />
        <CardStats
          title="Total em Estoque"
          value={`${totalEstoque} un.`}
          description={formatBRL(valorEstoque) + " em custo"}
          icon={BarChart3}
          color="success"
          className="stagger-2"
        />
        <CardStats
          title="Estoque Baixo"
          value={String(produtosBaixoEstoque.length)}
          description="Produtos abaixo do mínimo"
          icon={TrendingDown}
          color={produtosBaixoEstoque.length > 0 ? "warning" : "info"}
          className="stagger-3"
        />
        <CardStats
          title="Sem Estoque"
          value={String(produtosZerados.length)}
          description="Precisam de reposição"
          icon={AlertTriangle}
          color={produtosZerados.length > 0 ? "error" : "success"}
          className="stagger-4"
        />
      </div>

      {produtosBaixoEstoque.length > 0 && (
        <Card animated className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {produtosBaixoEstoque.map((p) => (
                <Badge
                  key={p.id}
                  variant={(p.qtdEstoque ?? 0) === 0 ? "error" : "warning"}
                  className="text-xs py-1 px-2"
                >
                  {p.nome}: {p.qtdEstoque ?? 0} un. (mín: {p.estoqueMinimo ?? 5})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <QueryTabs
        defaultTab={sp.tab || "visao-geral"}
        tabs={[
          {
            value: "visao-geral",
            label: "Visão Geral",
            content: (
              <Card className="mt-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-blue-900">Estoque Atual</CardTitle>
                  <form className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="q"
                      placeholder="Pesquisar produtos..."
                      defaultValue={sp.q}
                      className="pl-9 h-9"
                    />
                    <input type="hidden" name="tab" value="visao-geral" />
                  </form>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Produto</TableHead>
                          <TableHead className="font-semibold">Categoria</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="text-right font-semibold">Custo</TableHead>
                          <TableHead className="text-right font-semibold">Venda</TableHead>
                          <TableHead className="text-center font-semibold">Estoque</TableHead>
                          <TableHead className="text-center font-semibold">Mínimo</TableHead>
                          <TableHead className="text-center font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              Nenhum produto encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          produtos.map((p) => {
                            const estoque = p.qtdEstoque ?? 0;
                            const minimo = p.estoqueMinimo ?? 5;
                            const isZero = estoque === 0;
                            const isBaixo = estoque > 0 && estoque <= minimo;
                            return (
                              <TableRow key={p.id} className={cn(isZero && "bg-error/5", isBaixo && "bg-warning/5")}>
                                <TableCell className="font-medium">{p.nome}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="font-normal">{p.categoria || "N/A"}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">{p.fornecedor?.nome || "—"}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatBRL(p.custoPadrao)}</TableCell>
                                <TableCell className="text-right tabular-nums font-semibold">{formatBRL(p.valorVenda)}</TableCell>
                                <TableCell className="text-center tabular-nums font-bold text-lg">{estoque}</TableCell>
                                <TableCell className="text-center tabular-nums text-muted-foreground">{minimo}</TableCell>
                                <TableCell className="text-center">
                                  {isZero ? (
                                    <Badge variant="error" size="sm">Zerado</Badge>
                                  ) : isBaixo ? (
                                    <Badge variant="warning" size="sm">Baixo</Badge>
                                  ) : (
                                    <Badge variant="success" size="sm">OK</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "entrada",
            label: "Entrada de Mercadoria",
            content: (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <ArrowDownCircle className="h-5 w-5" />
                    Registrar Entrada
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Registre compras com ou sem nota fiscal. O estoque é atualizado automaticamente.
                  </p>
                </CardHeader>
                <CardContent>
                  <EstoqueEntradaForm
                    produtos={produtos.map((p) => ({
                      id: p.id,
                      nome: p.nome,
                      custoPadrao: p.custoPadrao,
                    }))}
                    fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
                    onEntradaAction={registrarEntradaEstoque}
                    onEntradaLoteAction={registrarEntradaLote}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "saida",
            label: "Saída Manual",
            content: (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <ArrowUpCircle className="h-5 w-5" />
                    Registrar Saída Manual
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Para ajustes, perdas ou devoluções. Saídas por venda são automáticas.
                  </p>
                </CardHeader>
                <CardContent>
                  <EstoqueSaidaForm
                    produtos={produtos.map((p) => ({
                      id: p.id,
                      nome: p.nome,
                      qtdEstoque: p.qtdEstoque,
                    }))}
                    onSaidaAction={registrarSaidaManual}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            value: "movimentacoes",
            label: "Histórico",
            content: (
              <Card className="mt-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Clock className="h-5 w-5" />
                      Histórico de Movimentações
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Últimas 100 movimentações registradas
                    </p>
                  </div>
                  <form className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="q_mov"
                      placeholder="Pesquisar por produto..."
                      defaultValue={sp.q_mov}
                      className="pl-9 h-9"
                    />
                    <input type="hidden" name="tab" value="movimentacoes" />
                  </form>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Produto</TableHead>
                          <TableHead className="text-center font-semibold">Tipo</TableHead>
                          <TableHead className="text-center font-semibold">Qtd</TableHead>
                          <TableHead className="font-semibold">Motivo</TableHead>
                          <TableHead className="text-right font-semibold">Custo Unit.</TableHead>
                          <TableHead className="font-semibold">NF</TableHead>
                          <TableHead className="font-semibold">Usuário</TableHead>
                          <TableHead className="font-semibold">Obs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                              Nenhuma movimentação encontrada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          movimentos.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-xs tabular-nums whitespace-nowrap">{formatDate(m.criadoEm)}</TableCell>
                              <TableCell className="font-medium text-sm">{m.produto.nome}</TableCell>
                              <TableCell className="text-center">
                                {m.tipo === "ENTRADA" ? (
                                  <Badge variant="success" size="sm" className="gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Entrada
                                  </Badge>
                                ) : (
                                  <Badge variant="error" size="sm" className="gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Saída
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center tabular-nums font-bold">{m.quantidade}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" size="sm" className="text-xs">
                                  {motivoLabel[m.motivoTipo] || m.motivoTipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {m.custoUnitario ? formatBRL(m.custoUnitario) : "—"}
                              </TableCell>
                              <TableCell className="text-xs">{m.notaFiscal || "—"}</TableCell>
                              <TableCell className="text-xs">{m.usuario || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {m.observacao || "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
