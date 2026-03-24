"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatBRL, cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { custoTotalVenda, margemVenda } from "@/lib/venda-utils";
import { useState } from "react";

const formatDateBR = (value: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value);

type SearchParams = {
  from?: string;
  to?: string;
  edit?: string;
  vendedor?: string;
  produto?: string;
  cliente?: string;
  descontoFolha?: string;
  boleto?: string;
  page?: string;
};

function buildUrl(sp: SearchParams, params: Partial<SearchParams>): string {
  const newParams = { ...sp, ...params };
  const search = new URLSearchParams();
  Object.entries(newParams).forEach(([k, v]) => {
    if (v) search.set(k, v);
  });
  return `/historico?${search.toString()}`;
}

type Venda = {
  id: number;
  dataVenda: Date;
  vendedor: string | null;
  produtoNome: string | null;
  quantidade: number | null;
  valorVenda: number | null;
  valorFrete: number | null;
  temNota: boolean | null;
  taxaNota: number | null;
  descontoEmFolha: boolean | null;
  boleto: boolean | null;
  asaasPaymentId: string | null;
  boletoUrl: string | null;
  cliente: { nome: string } | null;
  custoProduto?: number | null;
  assinatura?: { assinaturaStatus: string | null } | null;
  itens?: { produtoNome: string; custoProduto: number; quantidade: number; subtotal: number }[];
};

type Props = {
  vendas: Venda[];
  searchParams: SearchParams;
  gerarBoletoAction: (formData: FormData) => Promise<unknown>;
};

export function HistoricoVendasCards({ vendas, searchParams, gerarBoletoAction }: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {vendas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          Sem dados para os filtros selecionados.
        </div>
      ) : (
        vendas.map((v) => (
          <VendaCard
            key={v.id}
            venda={v}
            buildUrl={(p) => buildUrl(searchParams, p)}
            gerarBoletoAction={gerarBoletoAction}
          />
        ))
      )}
    </div>
  );
}

function VendaCard({
  venda,
  buildUrl,
  gerarBoletoAction,
}: {
  venda: Venda;
  buildUrl: (p: Partial<SearchParams>) => string;
  gerarBoletoAction: (formData: FormData) => Promise<unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const valorTotal =
    venda.itens && venda.itens.length > 0
      ? venda.itens.reduce((s, i) => s + i.subtotal, 0) + (venda.valorFrete ?? 0)
      : ((venda.valorVenda || 0) * (venda.quantidade || 1)) + (venda.valorFrete || 0);

  return (
    <Card variant="outline" className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">
                {venda.cliente?.nome || "N/D"}
              </p>
              <p className="text-sm text-muted-foreground truncate" title={
                venda.itens && venda.itens.length > 0
                  ? venda.itens.map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`).join(", ")
                  : venda.produtoNome || "—"
              }>
                {venda.itens && venda.itens.length > 0
                  ? venda.itens.map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`).join(", ")
                  : venda.produtoNome || "—"}
              </p>
              <p className="text-sm tabular-nums font-semibold text-primary mt-1">
                {formatBRL(valorTotal)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatDateBR(venda.dataVenda)}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] min-w-[44px] -m-2 p-2 justify-end"
                aria-expanded={expanded}
                aria-label={expanded ? "Recolher detalhes" : "Ver detalhes"}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span>Vendedor</span>
                <span className="text-foreground">{venda.vendedor || "—"}</span>
                <span>Qtd</span>
                <span className="text-foreground tabular-nums">
                  {venda.itens && venda.itens.length > 0
                    ? venda.itens.reduce((s, i) => s + i.quantidade, 0)
                    : venda.quantidade || 1}
                </span>
                <span>Custo</span>
                <span className="text-foreground tabular-nums">
                  {custoTotalVenda(venda) != null ? formatBRL(custoTotalVenda(venda)!) : "—"}
                </span>
                <span>Margem</span>
                <span className={`text-foreground tabular-nums ${(() => {
                  const m = margemVenda(venda);
                  if (m == null) return "opacity-50";
                  return m > 0 ? "text-emerald-600" : m === 0 ? "text-amber-500" : "text-red-500";
                })()}`}>
                  {(() => {
                    const m = margemVenda(venda);
                    return m != null ? `${m.toFixed(1)}%` : "—";
                  })()}
                </span>
                <span>Nota</span>
                <span className="text-foreground">
                  {venda.temNota ? (
                    <span className="text-success font-medium">Sim</span>
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
                </span>
                <span>Desconto folha</span>
                <span className="text-foreground">
                  {venda.descontoEmFolha ? (
                    <span className="text-success font-medium">Sim</span>
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
                </span>
                <span>Boleto</span>
                <span className="text-foreground">
                  {venda.boleto ? (
                    venda.boletoUrl ? (
                      <a
                        href={venda.boletoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0 text-xs")}
                      >
                        Ver boleto
                      </a>
                    ) : (
                      <form
                        action={async (fd) => {
                          await gerarBoletoAction(fd);
                        }}
                        className="inline"
                      >
                        <input type="hidden" name="vendaId" value={venda.id} />
                        <button
                          type="submit"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs touch-manipulation min-h-[36px]")}
                        >
                          Gerar boleto
                        </button>
                      </form>
                    )
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
                </span>
                <span>Assinado</span>
                <span className="text-foreground">
                  {venda.assinatura?.assinaturaStatus === "assinado" ? (
                    <a href={`/api/comprovante?vendaId=${venda.id}`} target="_blank" rel="noopener noreferrer">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </a>
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Link
              href={buildUrl({ edit: venda.id.toString() }) + "#editar-venda"}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "touch-manipulation min-h-[44px]")}
            >
              Editar
            </Link>
            <ReciboDownloadLink
              vendaId={venda.id}
              tipo={venda.descontoEmFolha ? "autorizacao" : "venda"}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "touch-manipulation min-h-[44px]")}
              label={venda.descontoEmFolha ? "Autorização" : "PDF"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
