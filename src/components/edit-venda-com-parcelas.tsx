"use client";

import { useState, useCallback } from "react";
import { EditVendaItens } from "@/components/edit-venda-itens-client";
import { EditParcelasSection } from "@/components/edit-parcelas-section";
import { FormSecaoTitulo } from "@/components/form-secao-titulo";
import { Input } from "@/components/ui/input";
import { totalParaParcelas } from "@/lib/parcelas-ajuste";
import { DataDescontoUnica } from "@/components/data-desconto-unica";
import { dataDaRegraIso } from "@/lib/data-desconto-unica";
import type { RegraVencimento } from "@/lib/regra-empresa";

interface ProdutoItem {
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

interface Parcela {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface Props {
  initialItens: ProdutoItem[];
  initialParcelas: Parcela[];
  initialNumeroParcelas: number;
  /** Frete e desconto atuais do form: as parcelas somam itens + frete − desconto. */
  frete: number;
  desconto: number;
  dataVenda: string;
  parcelasPagas?: number[];
  /**
   * Data do desconto da venda 1x em folha (2026-10-01). `dataVendaAtual` é a do campo (a regra
   * acompanha); `gravada` é o vencimento da parcela 1 no banco; `bloqueio`, o motivo de não mudar.
   */
  dataDesconto?: {
    emFolha: boolean;
    dataVendaAtual: string;
    gravada: string | null;
    bloqueio: string | null;
    regra: RegraVencimento | null;
  };
}

export function EditVendaComParcelas({
  initialItens,
  initialParcelas,
  initialNumeroParcelas,
  frete,
  desconto,
  dataVenda,
  parcelasPagas,
  dataDesconto,
}: Props) {
  // Começa na soma dos itens, a mesma que EditVendaItens avisa na montagem: se começasse
  // em outro valor, a primeira notificação mudaria o total e as parcelas seriam
  // redistribuídas só por abrir a edição.
  const [subtotalItens, setSubtotalItens] = useState(() =>
    initialItens.reduce((s, i) => s + i.subtotal, 0),
  );
  const [numeroParcelas, setNumeroParcelas] = useState(initialNumeroParcelas);

  const handleTotalChange = useCallback((t: number) => setSubtotalItens(t), []);

  // Data gravada diferente da regra = foi escolhida: o campo a mantém mesmo se a data da venda
  // mudar. Igual à regra (ou sem linha) = acompanha a regra. Bloqueada: mostra a gravada.
  const dataRegra = dataDesconto ? dataDaRegraIso(dataDesconto.dataVendaAtual, dataDesconto.regra) : null;
  const [dataDescontoEscolhida, setDataDescontoEscolhida] = useState<string | null>(() => {
    const gravada = dataDesconto?.gravada ?? null;
    const regraInicial = dataDesconto ? dataDaRegraIso(dataVenda, dataDesconto.regra) : null;
    return gravada && gravada !== regraInicial ? gravada : null;
  });
  const mostrarDataDesconto = numeroParcelas === 1 && Boolean(dataDesconto?.emFolha) && dataRegra !== null;

  return (
    <>
      <EditVendaItens initialItens={initialItens} onTotalChange={handleTotalChange} />

      <FormSecaoTitulo>Pagamento e parcelas</FormSecaoTitulo>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
        <Input
          name="parcelas"
          type="number"
          min={1}
          value={numeroParcelas}
          onChange={(e) => setNumeroParcelas(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>

      {mostrarDataDesconto && dataDesconto && dataRegra && (
        <DataDescontoUnica
          id="edit-data-desconto"
          name="dataDescontoUnica"
          dataVenda={dataDesconto.dataVendaAtual}
          dataRegra={dataRegra}
          escolhida={dataDesconto.bloqueio ? dataDesconto.gravada : dataDescontoEscolhida}
          onEscolhidaChange={setDataDescontoEscolhida}
          bloqueio={dataDesconto.bloqueio}
          labelClassName="text-xs font-medium text-muted-foreground"
          avisoClassName="md:col-span-3"
        />
      )}

      <EditParcelasSection
        initialParcelas={initialParcelas}
        numeroParcelas={numeroParcelas}
        valorTotal={totalParaParcelas({ subtotalItens, frete, desconto })}
        dataVenda={dataVenda}
        parcelasPagas={parcelasPagas}
      />
    </>
  );
}
