"use client";

import { Label } from "@/components/ui/label";
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

  // Data gravada diferente da regra aparece como escolhida (é o que está no banco). Igual à regra
  // (ou sem linha) = acompanha a regra. Sem tocar no campo, mudar a data da venda volta a seguir a
  // regra, como o servidor faz sem o campo. Só a escolha vai no formulário: sem ela o servidor
  // mantém a gravada (mesma data de venda) ou recalcula pela regra vigente na data nova.
  const dataRegra = dataDesconto ? dataDaRegraIso(dataDesconto.dataVendaAtual, dataDesconto.regra) : null;
  const [dataDescontoEscolhida, setDataDescontoEscolhida] = useState<string | null>(() => {
    const gravada = dataDesconto?.gravada ?? null;
    const regraInicial = dataDesconto ? dataDaRegraIso(dataVenda, dataDesconto.regra) : null;
    return gravada && gravada !== regraInicial ? gravada : null;
  });
  const [dataDescontoTocada, setDataDescontoTocada] = useState(false);
  const escolhidaEfetiva =
    dataDesconto && !dataDescontoTocada && dataDesconto.dataVendaAtual !== dataVenda ? null : dataDescontoEscolhida;
  const escolherDataDesconto = useCallback((v: string | null) => {
    setDataDescontoTocada(true);
    setDataDescontoEscolhida(v);
  }, []);
  const mostrarDataDesconto = numeroParcelas === 1 && Boolean(dataDesconto?.emFolha) && dataRegra !== null;
  // Vai no formulário a escolha, ou a volta para a regra quando a gravada é outra e a data da venda
  // não mudou (sem o campo, o servidor manteria a gravada).
  const enviarDataDesconto =
    escolhidaEfetiva !== null ||
    (dataDesconto != null &&
      dataDesconto.dataVendaAtual === dataVenda &&
      dataDesconto.gravada != null &&
      dataDesconto.gravada !== dataRegra);

  return (
    <>
      <EditVendaItens initialItens={initialItens} onTotalChange={handleTotalChange} />

      <FormSecaoTitulo>Pagamento e parcelas</FormSecaoTitulo>

      <div className="space-y-1">
        <Label size="sm" htmlFor="edit-parcelas">Parcelas</Label>
        <Input
          id="edit-parcelas"
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
          name={enviarDataDesconto ? "dataDescontoUnica" : undefined}
          dataVenda={dataDesconto.dataVendaAtual}
          dataRegra={dataRegra}
          escolhida={dataDesconto.bloqueio ? dataDesconto.gravada : escolhidaEfetiva}
          onEscolhidaChange={escolherDataDesconto}
          bloqueio={dataDesconto.bloqueio}
          labelSize="sm"
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
