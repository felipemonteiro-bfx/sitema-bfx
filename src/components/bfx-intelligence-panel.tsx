"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatBRL } from "@/lib/utils";
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

// Variante de Badge por tipo de sugestão: o estado vai no Badge, não no contêiner.
const tipoBadgeVariant = {
  recompra: "info",
  upgrade: "info",
  complementar: "success",
  novo: "warning",
} as const;

export function BFXIntelligencePanel({ clienteId, produtoSelecionado, onAddProduto }: Props) {
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [sugestoesProduto, setSugestoesProduto] = useState<SugestoesProduto | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) {
      queueMicrotask(() => {
        setPerfil(null);
        setSugestoesProduto(null);
      });
      return;
    }

    setLoadingPerfil(true);
    setError(null);

    fetch(`/api/clientes/${clienteId}/perfil-vendas`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Erro ao carregar perfil do cliente");
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
      queueMicrotask(() => setSugestoesProduto(null));
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
      <Card>
        <CardContent className="py-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Analisando perfil do cliente...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-error-text" aria-hidden="true" />
          <p className="text-sm text-foreground">{error}</p>
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              BFX Intelligence
            </div>
            <Badge variant="secondary">
              {perfil.metricas.totalCompras} compra{perfil.metricas.totalCompras !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sem sombra (D-03): bloco tem borda propria e vive dentro do
              Card (que tem a sua) — mesmo plano. */}
          {perfil.ultimaVenda && (
            <div className="bg-card-elevated rounded-interno p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Última compra
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
                  <div className="text-lg font-semibold tabular-nums text-foreground valor-sensivel valor-sensivel-fim">
                    {formatBRL(perfil.ultimaVenda.valorTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card-elevated rounded-interno p-4 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
              <div className="text-sm font-medium text-muted-foreground">Ticket médio</div>
              <div className="text-sm font-semibold tabular-nums text-foreground valor-sensivel">{formatBRL(perfil.metricas.ticketMedio)}</div>
            </div>
            <div className="bg-card-elevated rounded-interno p-4 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
              <div className="text-sm font-medium text-muted-foreground">Renda</div>
              <div className="text-sm font-semibold tabular-nums text-foreground valor-sensivel">
                {perfil.cliente.renda ? formatBRL(perfil.cliente.renda) : "N/I"}
              </div>
            </div>
            <div className="bg-card-elevated rounded-interno p-4 text-center">
              <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" aria-hidden="true" />
              <div className="text-sm font-medium text-muted-foreground">Capacidade</div>
              <div className="text-sm font-semibold tabular-nums text-foreground valor-sensivel">{formatBRL(perfil.metricas.capacidadeCompra)}</div>
            </div>
          </div>

          {perfil.categoriasFavoritas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {perfil.categoriasFavoritas.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {perfil.sugestoesProativas.length > 0 && (
            <>
              <Separator />

              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Sugestões para este cliente
                </div>

                <div className="space-y-2">
                  {perfil.sugestoesProativas.map((sugestao) => {
                    const Icon = tipoIcons[sugestao.tipo] || Star;
                    const badgeVariant = tipoBadgeVariant[sugestao.tipo] || tipoBadgeVariant.novo;

                    return (
                      <div
                        key={sugestao.id}
                        // Sem sombra (D-03): linha da lista tem borda propria
                        // e vive dentro do Card — mesmo plano.
                        className="flex items-center gap-3 p-4 bg-card-elevated rounded-interno transition-colors hover:bg-poco group cursor-pointer"
                        onClick={() =>
                          onAddProduto({
                            id: sugestao.id,
                            nome: sugestao.nome,
                            valorVenda: sugestao.valorVenda,
                          })
                        }
                      >
                        <div className="h-10 w-10 rounded-controle bg-poco text-muted-foreground flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant={badgeVariant} size="sm">
                              {sugestao.tipo === "recompra" && "Recompra"}
                              {sugestao.tipo === "upgrade" && "Upgrade"}
                              {sugestao.tipo === "complementar" && "Complementar"}
                              {sugestao.tipo === "novo" && "Novidade"}
                            </Badge>
                          </div>
                          <div className="text-sm font-semibold text-foreground truncate transition-colors">
                            {sugestao.nome}
                          </div>
                          <div className="text-xs text-muted-foreground">{sugestao.motivo}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold tabular-nums text-foreground valor-sensivel valor-sensivel-fim">
                            {formatBRL(sugestao.valorVenda)}
                          </div>
                          <Button
                            size="xs"
                            variant="ghost"

                            onClick={(e) => {
                              e.stopPropagation();
                              onAddProduto({
                                id: sugestao.id,
                                nome: sugestao.nome,
                                valorVenda: sugestao.valorVenda,
                              });
                            }}
                          >
                            <Plus className="h-3 w-3" />
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
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Aumentar ticket - {produtoSelecionado.nome}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-2 pb-4 px-4">
            {loadingSugestoes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" aria-hidden="true" />
                <span className="text-sm text-muted-foreground ml-2">Buscando sugestões...</span>
              </div>
            ) : sugestoesProduto ? (
              <div className="space-y-3">
                {sugestoesProduto.upsell && sugestoesProduto.upsell.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      Upsell - versão superior
                    </div>
                    <div className="space-y-2">
                      {sugestoesProduto.upsell.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          // Sem sombra (D-03): item tem borda propria e vive
                          // dentro do Card — mesmo plano.
                          className="flex items-center justify-between p-4 bg-card-elevated rounded-interno transition-colors hover:bg-poco cursor-pointer group"
                          onClick={() =>
                            onAddProduto({
                              id: item.id,
                              nome: item.nome,
                              valorVenda: item.valorVenda,
                            })
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {item.nome}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.diferenca && item.diferenca > 0 && (
                              <Badge variant="secondary" className="valor-sensivel">
                                +{formatBRL(item.diferenca)}
                              </Badge>
                            )}
                            <span className="text-sm font-semibold tabular-nums text-foreground valor-sensivel">
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
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Plus className="h-3 w-3" aria-hidden="true" />
                      Cross-sell - complemente a venda
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sugestoesProduto.crossSell.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          // Sem sombra (D-03): item tem borda propria e vive
                          // dentro do Card — mesmo plano.
                          className="p-4 bg-card-elevated rounded-interno transition-colors hover:bg-poco cursor-pointer group"
                          onClick={() =>
                            onAddProduto({
                              id: item.id,
                              nome: item.nome,
                              valorVenda: item.valorVenda,
                            })
                          }
                        >
                          <div className="text-xs font-semibold text-foreground truncate">
                            {item.nome}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground truncate flex-1">
                              {item.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-foreground ml-2 valor-sensivel">
                              {formatBRL(item.valorVenda)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sugestoesProduto.bundle && (
                  <div className="bg-card-elevated rounded-interno p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                        {sugestoesProduto.bundle.label}
                      </div>
                      <Badge variant="warning" size="sm">
                        Economize <span className="valor-sensivel">{formatBRL(sugestoesProduto.bundle.economiaBundle)}</span>
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
                      <span className="text-lg font-semibold tabular-nums text-foreground valor-sensivel">
                        {formatBRL(sugestoesProduto.bundle.valorTotal)}
                      </span>
                      <Button
                        size="sm"
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
                        <Plus className="h-3 w-3" />
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
