"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatBRL } from "@/lib/utils";
import type { LinhaItem } from "@/lib/itens-venda";
import { usePopoverHover } from "@/hooks/use-popover-hover";

export interface ProdutosDaVenda {
  linhas: LinhaItem[];
  totais: { quantidade: number; valor: number };
}

// O padrão do Table (cabeçalho h-11, célula p-3) é para telas cheias; aqui é um
// popover. Números no topo da célula: com nome quebrado em várias linhas, a
// quantidade e o valor ficam na altura da primeira linha do produto.
const CELULA = "px-2 py-1.5 align-top";
const NUMERO = "px-2 py-1.5 align-top text-right tabular-nums whitespace-nowrap";

/**
 * Produtos de uma venda com vários itens, em tabela: Produto | Qtd. | Valor, o
 * preço de cada unidade quando a quantidade passa de 1 e o total no rodapé.
 * Tudo vem pronto do servidor (`linhasDosItens`); aqui só se mostra. Abre no
 * hover, fixa no clique (`usePopoverHover`).
 */
export function ProdutosVendaPopover({ produtos, className }: { produtos: ProdutosDaVenda; className?: string }) {
  const { estado, popover, gatilho, conteudo } = usePopoverHover();
  const { linhas, totais } = produtos;

  return (
    <Popover {...popover}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          {...gatilho}
          className={cn("-ml-3 gap-1 font-semibold", estado.fixo && "bg-muted", className)}
        >
          {linhas.length} produtos
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-96 p-3" {...conteudo}>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Produtos da venda</div>
        {/* Tabela de verdade: colunas alinhadas e lidas como tabela pelo leitor de
            tela. Venda com muitos itens rola por dentro, com cabeçalho e total fixos.
            O nome aparece inteiro, quebrando linha — nada de reticências. */}
        <div className="[&>div]:max-h-[min(26rem,60dvh)]">
          <Table className="text-sm [&_tfoot]:sticky [&_tfoot]:bottom-0">
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-2">Produto</TableHead>
                <TableHead className="h-8 w-12 px-2 text-right">Qtd.</TableHead>
                <TableHead className="h-8 px-2 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha, idx) => (
                <TableRow key={idx} className="hover:bg-transparent">
                  <TableCell className={cn(CELULA, "break-words")}>{linha.produtoNome}</TableCell>
                  <TableCell className={NUMERO}>{linha.quantidade}</TableCell>
                  <TableCell className={NUMERO}>
                    <div className="font-medium">{formatBRL(linha.subtotal)}</div>
                    {linha.unitario !== null && (
                      <div className="text-xs text-muted-foreground">{formatBRL(linha.unitario)} cada</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {/* So a soma dos itens: o Valor da linha da fila pode incluir frete e desconto. */}
            <TableFooter className="bg-card">
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-2 py-2 font-bold">Total dos produtos</TableCell>
                <TableCell className="px-2 py-2 text-right font-bold tabular-nums">{totais.quantidade}</TableCell>
                <TableCell className="px-2 py-2 text-right font-bold tabular-nums whitespace-nowrap">
                  {formatBRL(totais.valor)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {!estado.fixo && (
          <p className="mt-2 text-xs text-muted-foreground">Clique em &ldquo;{linhas.length} produtos&rdquo; para manter aberto.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
