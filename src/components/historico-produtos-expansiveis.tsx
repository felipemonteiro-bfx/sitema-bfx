"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatBRL } from "@/lib/utils";

type Item = { produtoNome: string; quantidade: number; subtotal: number };
type Expansao = { aberta: boolean; alternar: () => void; detalhesId: string; vendaId: number; quantidade: number };
const ProdutosContext = createContext<Expansao | null>(null);

export function HistoricoLinhaVenda({ vendaId, itens, children }: { vendaId: number; itens: Item[]; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const detalhesId = `produtos-${useId()}`;

  return (
    <ProdutosContext.Provider value={{ aberta, alternar: () => setAberta((atual) => !atual), detalhesId, vendaId, quantidade: itens.length }}>
      <TableRow>{children}</TableRow>
      {itens.length > 1 && (
        <TableRow id={detalhesId} hidden={!aberta} semHover>
          <TableCell colSpan={10} fundo="elevado" className="p-0">
            <div className="tabela-detalhes-visiveis sticky left-0 space-y-3 p-4" role="region" aria-label={`Produtos da venda ${vendaId}`}>
              <h3 className="text-sm font-semibold">Produtos da venda #{vendaId}</h3>
              <Table variant="compact" className="table-fixed" aria-label={`Itens da venda ${vendaId}`}>
                <colgroup><col /><col className="w-16" /><col className="w-32" /></colgroup>
                <TableHeader>
                  <TableRow semHover>
                    <TableHead scope="col">Produto</TableHead>
                    <TableHead scope="col" className="text-right">Qtd</TableHead>
                    <TableHead scope="col" className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item, indice) => (
                    <TableRow key={indice} semHover>
                      <TableCell className="break-words">{item.produtoNome}</TableCell>
                      <TableCell numeric>{item.quantidade}</TableCell>
                      <TableCell numeric className="whitespace-nowrap valor-sensivel valor-sensivel-fim">{formatBRL(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </ProdutosContext.Provider>
  );
}

export function HistoricoProdutosToggle() {
  const expansao = useContext(ProdutosContext);
  if (!expansao || expansao.quantidade < 2) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="-ml-2 gap-2"
      aria-expanded={expansao.aberta}
      aria-controls={expansao.detalhesId}
      aria-label={`${expansao.aberta ? "Ocultar" : "Mostrar"} produtos da venda ${expansao.vendaId}`}
      onClick={expansao.alternar}
    >
      <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", expansao.aberta && "rotate-180")} aria-hidden="true" />
      {expansao.quantidade} produtos
    </Button>
  );
}
