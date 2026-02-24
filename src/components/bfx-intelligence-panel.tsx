"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBRL, cn } from "@/lib/utils";
import {
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  Package,
  ArrowUpRight,
  Plus,
  Zap,
  Star,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface PerfilCliente {
  cliente: {
    id: number;
    nome: string;
    renda: number | null;
    tipo: string | null;
  };
  ultimaVenda: {
    id: number;
    data: string;
    produtos: string[];
    valorTotal: number;
    parcelas: number;
  } | null;
  metricas: {
    ticketMedio: number;
    totalCompras: number;
    valorTotalGasto: number;
    capacidadeCompra: number;
  };
  categoriasFavoritas: string[];
  produtosFrequentes: string[];
  sugestoesProativas: {
    id: number;
    nome: string;
    valorVenda: number;
    motivo: string;
    tipo: "recompra" | "upgrade" | "complementar" | "novo";
  }[];
}

interface SugestaoItem {
  id: number;
  nome: string;
  valorVenda: number;
  label: string;
  diferenca?: number;
}

interface SugestoesProduto {
  upsell: SugestaoItem[];
  crossSell: SugestaoItem[];
  bundle?: {
    produtos: SugestaoItem[];
    valorTotal: number;
    economiaBundle: number;
    label: string;
  };
}

interface Props {
  clienteId: number | null;
  produtoSelecionado?: { id: number; nome: string; valorVenda?: number } | null;
  onAddProduto: (produto: { id: number; nome: string; valorVenda: number; custoProduto?: number }) => void;
}

const tipoIcons = {
  recompra: RefreshCw,
  upgrade: ArrowUpRight,
  complementar: Plus,
  novo: Star,
};

const tipoBadgeColors = {
  recompra: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  upgrade: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  complementar: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  novo: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function BFXIntelligencePanel({ clienteId, produtoSelecionado, onAddProduto }: Props) {
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [sugestoesProduto, setSugestoesProduto] = useState<SugestoesProduto | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) {
      setPerfil(null);
      setSugestoesProduto(null);
      return;
    }

    setLoadingPerfil(true);
    setError(null);

    fetch(`/api/clientes/${clienteId}/perfil-vendas`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setPerfil(null);
        } else {
          setPerfil(data);
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar perfil:", err);
        setError("Erro ao carregar perfil do cliente");
      })
      .finally(() => setLoadingPerfil(false));
  }, [clienteId]);

  useEffect(() => {
    if (!produtoSelecionado?.id) {
      setSugestoesProduto(null);
      return;
    }

    setLoadingSugestoes(true);

    const clienteParam = clienteId ? `&clienteId=${clienteId}` : "";
    fetch(`/api/vendas/sugestoes?produtoId=${produtoSelecionado.id}${clienteParam}`)
      .then((res) => res.json())
      .then((data) => setSugestoesProduto(data))
      .catch((err) => console.error("Erro ao buscar sugestões:", err))
      .finally(() => setLoadingSugestoes(false));
  }, [produtoSelecionado?.id, clienteId]);

  if (!clienteId) return null;

  if (loadingPerfil) {
    return (
      <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Analisando perfil do cliente...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-dashed border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="py-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!perfil) return null;

  const formatData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-violet-950/30">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-5 w-5" />
              BFX Intelligence
            </div>
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              {perfil.metricas.totalCompras} compra{perfil.metricas.totalCompras !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {perfil.ultimaVenda && (
            <div className="bg-white dark:bg-card rounded-xl p-4 border border-purple-100 dark:border-purple-900/30 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2">
                <Clock className="h-3.5 w-3.5" />
                Última Compra
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {perfil.ultimaVenda.produtos.slice(0, 2).join(", ")}
                    {perfil.ultimaVenda.produtos.length > 2 && ` +${perfil.ultimaVenda.produtos.length - 2}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatData(perfil.ultimaVenda.data)} • {perfil.ultimaVenda.parcelas}x
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {formatBRL(perfil.ultimaVenda.valorTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-card rounded-xl p-3 border border-purple-100 dark:border-purple-900/30 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Ticket Médio</div>
              <div className="text-sm font-black text-foreground">{formatBRL(perfil.metricas.ticketMedio)}</div>
            </div>
            <div className="bg-white dark:bg-card rounded-xl p-3 border border-purple-100 dark:border-purple-900/30 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Renda</div>
              <div className="text-sm font-black text-foreground">
                {perfil.cliente.renda ? formatBRL(perfil.cliente.renda) : "N/I"}
              </div>
            </div>
            <div className="bg-white dark:bg-card rounded-xl p-3 border border-purple-100 dark:border-purple-900/30 text-center">
              <Target className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Capacidade</div>
              <div className="text-sm font-black text-foreground">{formatBRL(perfil.metricas.capacidadeCompra)}</div>
            </div>
          </div>

          {perfil.categoriasFavoritas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {perfil.categoriasFavoritas.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {perfil.sugestoesProativas.length > 0 && (
            <>
              <Separator className="bg-purple-200 dark:bg-purple-800" />

              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">
                  <Zap className="h-3.5 w-3.5" />
                  Sugestões para este Cliente
                </div>

                <div className="space-y-2">
                  {perfil.sugestoesProativas.map((sugestao) => {
                    const Icon = tipoIcons[sugestao.tipo] || Star;
                    const badgeColor = tipoBadgeColors[sugestao.tipo] || tipoBadgeColors.novo;

                    return (
                      <div
                        key={sugestao.id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-card rounded-xl border border-purple-100 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() =>
                          onAddProduto({
                            id: sugestao.id,
                            nome: sugestao.nome,
                            valorVenda: sugestao.valorVenda,
                          })
                        }
                      >
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge className={cn("text-[9px] h-4 border-0", badgeColor)}>
                              {sugestao.tipo === "recompra" && "Recompra"}
                              {sugestao.tipo === "upgrade" && "Upgrade"}
                              {sugestao.tipo === "complementar" && "Complementar"}
                              {sugestao.tipo === "novo" && "Novidade"}
                            </Badge>
                          </div>
                          <div className="text-sm font-semibold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {sugestao.nome}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{sugestao.motivo}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-black text-purple-600 dark:text-purple-400">
                            {formatBRL(sugestao.valorVenda)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddProduto({
                                id: sugestao.id,
                                nome: sugestao.nome,
                                valorVenda: sugestao.valorVenda,
                              });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {produtoSelecionado && (
        <Card className="overflow-hidden border-2 border-indigo-200/50 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <Package className="h-4 w-4" />
              Aumentar Ticket - {produtoSelecionado.nome}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-2 pb-4 px-4">
            {loadingSugestoes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-sm text-muted-foreground ml-2">Buscando sugestões...</span>
              </div>
            ) : sugestoesProduto ? (
              <div className="space-y-3">
                {sugestoesProduto.upsell && sugestoesProduto.upsell.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Upsell - Versão Superior
                    </div>
                    <div className="space-y-2">
                      {sugestoesProduto.upsell.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-card rounded-lg border border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() =>
                            onAddProduto({
                              id: item.id,
                              nome: item.nome,
                              valorVenda: item.valorVenda,
                            })
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {item.nome}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{item.label}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.diferenca && item.diferenca > 0 && (
                              <Badge className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-0">
                                +{formatBRL(item.diferenca)}
                              </Badge>
                            )}
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              {formatBRL(item.valorVenda)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sugestoesProduto.crossSell && sugestoesProduto.crossSell.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      Cross-sell - Complemente a Venda
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sugestoesProduto.crossSell.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-white dark:bg-card rounded-lg border border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() =>
                            onAddProduto({
                              id: item.id,
                              nome: item.nome,
                              valorVenda: item.valorVenda,
                            })
                          }
                        >
                          <div className="text-xs font-semibold text-foreground truncate group-hover:text-green-600 dark:group-hover:text-green-400">
                            {item.nome}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground truncate flex-1">
                              {item.label}
                            </span>
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 ml-2">
                              {formatBRL(item.valorVenda)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sugestoesProduto.bundle && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-3 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {sugestoesProduto.bundle.label}
                      </div>
                      <Badge className="text-[9px] bg-amber-500 text-white border-0">
                        Economize {formatBRL(sugestoesProduto.bundle.economiaBundle)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {sugestoesProduto.bundle.produtos.map((p, i) => (
                        <span key={p.id} className="text-xs text-foreground">
                          {p.nome}
                          {i < sugestoesProduto.bundle!.produtos.length - 1 && " +"}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {formatBRL(sugestoesProduto.bundle.valorTotal)}
                      </span>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => {
                          sugestoesProduto.bundle?.produtos.forEach((p) => {
                            onAddProduto({
                              id: p.id,
                              nome: p.nome,
                              valorVenda: p.valorVenda,
                            });
                          });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Kit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma sugestão disponível para este produto
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
