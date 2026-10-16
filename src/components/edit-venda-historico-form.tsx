"use client";

import { useState, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/form-select";
import {
  FORMAS_PAGAMENTO_LIST,
  formaFromLegacyFlags,
  formaPagamentoLabel,
  type FormaPagamento,
} from "@/lib/forma-pagamento";
import { DateInput } from "@/components/ui/date-input";
import { EditVendaComParcelas } from "@/components/edit-venda-com-parcelas";
import { DeleteVendaButton } from "@/components/delete-venda-button";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { FormSecaoTitulo } from "@/components/form-secao-titulo";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import type { RegraVencimento } from "@/lib/regra-empresa";
import { RecebimentoParcelas } from "@/components/recebimento-parcelas";
import type { ParcelaRecebimento } from "@/lib/recebimento-parcelas";

type ProdutoItem = {
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
};

type Parcela = {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
};

type EditVendaData = {
  id: number;
  dataVenda: Date;
  vendedor: string | null;
  valorFrete: number | null;
  custoEnvio: number | null;
  entrega: boolean | null;
  custoProduto: number | null;
  valorVenda: number | null;
  quantidade: number | null;
  produtoNome: string | null;
  parcelas: number | null;
  temNota: boolean;
  taxaNota: number | null;
  desconto: number | null;
  descontoEmFolha: boolean | null;
  boleto: boolean | null;
  formaPagamento?: string | null;
  asaasPaymentId: string | null;
  boletoUrl: string | null;
  itens: ProdutoItem[];
};

type Props = {
  editVenda: EditVendaData;
  editParcelasVenc: Parcela[];
  parcelasPagas?: number[];
  /** Data do desconto da venda 1x em folha: gravada, motivo de bloqueio e regra da empresa. */
  dataDesconto?: { gravada: string | null; bloqueio: string | null; regra: RegraVencimento | null };
  recebimento?: { parcelas: ParcelaRecebimento[]; hoje: string; podeDarBaixa: boolean };
  vendedores: { nomeExibicao: string | null; username: string }[];
  updateAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteAction: (formData: FormData) => Promise<{ success: boolean; error?: string } | void>;
  gerarBoletoAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
};

export function EditVendaHistoricoForm({
  editVenda,
  editParcelasVenc,
  parcelasPagas,
  dataDesconto,
  recebimento,
  vendedores,
  updateAction,
  deleteAction,
  gerarBoletoAction,
}: Props) {
  const [loading, setLoading] = useState(false);
  // Texto do input (aceita "" e "1." enquanto digita); as parcelas recebem o número.
  const [frete, setFrete] = useState(String(editVenda.valorFrete || 0));
  const [desconto, setDesconto] = useState(String(editVenda.desconto || 0));
  // Data da venda e forma de pagamento acompanhadas para a "Data do desconto" em 1x em folha
  // (2026-10-01): o campo só existe em folha e a data da regra muda com a data da venda.
  const dataVendaGravada = editVenda.dataVenda.toISOString().slice(0, 10);
  const formaInicial =
    (editVenda.formaPagamento as FormaPagamento | null | undefined) ??
    formaFromLegacyFlags({
      descontoEmFolha: editVenda.descontoEmFolha,
      boleto: editVenda.boleto,
      parcelas: editVenda.parcelas,
    });
  const [dataVendaAtual, setDataVendaAtual] = useState(dataVendaGravada);
  const [formaAtual, setFormaAtual] = useState<string>(formaInicial);
  const router = useRouter();

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await updateAction(formData);
      if (!result.success) {
        toast.error(result.error || "Erro ao salvar alterações.");
        return;
      }
      toast.success("Venda atualizada com sucesso!");
      // Sem isso os valores editados so aparecem no card depois de F5.
      startTransition(() => { router.refresh(); });
    } catch {
      toast.error("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [updateAction, router]);

  return (
    <form onSubmit={handleSubmit} className="grid min-w-0 gap-4 md:grid-cols-3">
      <input type="hidden" name="id" value={editVenda.id} />

      <FormSecaoTitulo>Dados da venda</FormSecaoTitulo>

      <div className="space-y-1">
        <Label htmlFor="edit-data">Data da venda</Label>
        <DateInput id="edit-data" name="data" defaultValue={dataVendaGravada} onChange={setDataVendaAtual} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-vendedor">Vendedor</Label>
        <FormSelect
          id="edit-vendedor"
          name="vendedor"
          defaultValue={editVenda.vendedor || ""}
          options={[
            ...(editVenda.vendedor && !vendedores.some((v) => (v.nomeExibicao || v.username) === editVenda.vendedor)
              ? [{ value: editVenda.vendedor, label: editVenda.vendedor }]
              : []),
            ...vendedores.map((v) => ({
              value: String(v.nomeExibicao || v.username),
              label: String(v.nomeExibicao || v.username),
            })),
          ]}
          placeholder="Selecione o vendedor"
        />
      </div>

      <FormSecaoTitulo>Produtos</FormSecaoTitulo>

      <EditVendaComParcelas
        initialItens={
          editVenda.itens.length > 0
            ? editVenda.itens
            : [{
                produtoNome: editVenda.produtoNome || "",
                custoProduto: editVenda.custoProduto || 0,
                valorVenda: editVenda.valorVenda || 0,
                quantidade: editVenda.quantidade || 1,
                subtotal: (editVenda.valorVenda || 0) * (editVenda.quantidade || 1),
              }]
        }
        initialParcelas={editParcelasVenc}
        initialNumeroParcelas={editVenda.parcelas || 1}
        frete={Number(frete) || 0}
        desconto={Number(desconto) || 0}
        dataVenda={dataVendaGravada}
        parcelasPagas={parcelasPagas}
        dataDesconto={{
          emFolha: formaAtual === FORMA_PAGAMENTO.DESCONTO_FOLHA,
          dataVendaAtual,
          gravada: dataDesconto?.gravada ?? null,
          bloqueio: dataDesconto?.bloqueio ?? null,
          regra: dataDesconto?.regra ?? null,
        }}
      />

      {/* Forma de pagamento canonica. Quando a venda nao tem o campo (vendas antigas
          em outras paginas), derivamos dos flags legados (descontoEmFolha/boleto/parcelas).
          Fica logo depois de EditVendaComParcelas, dentro do grupo "Pagamento e parcelas"
          (titulo renderizado pelo proprio EditVendaComParcelas). */}
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="edit-formaPagamento">Forma de pagamento</Label>
        <FormSelect
          id="edit-formaPagamento"
          name="formaPagamento"
          defaultValue={formaInicial}
          onValueChange={setFormaAtual}
          options={FORMAS_PAGAMENTO_LIST.map((f) => ({ value: f, label: formaPagamentoLabel(f) }))}
        />
      </div>

      {recebimento && recebimento.parcelas.length > 0 && (
        <RecebimentoParcelas
          parcelas={recebimento.parcelas}
          hoje={recebimento.hoje}
          podeDarBaixa={recebimento.podeDarBaixa}
        />
      )}

      <FormSecaoTitulo>Custos e descontos</FormSecaoTitulo>

      <div className="space-y-1">
        <Label htmlFor="edit-frete">Frete ao cliente</Label>
        <Input id="edit-frete" name="frete" type="number" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-envio">Custo de envio</Label>
        <Input id="edit-envio" name="envio" type="number" step="0.01" defaultValue={editVenda.custoEnvio || 0} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-entrega">Entrega ou retirada</Label>
        <FormSelect
          id="edit-entrega"
          name="entrega"
          defaultValue={editVenda.entrega === true ? "1" : editVenda.entrega === false ? "0" : ""}
          options={[
            ...(editVenda.entrega == null ? [{ value: "", label: "Não informado" }] : []),
            { value: "1", label: "Entrega" },
            { value: "0", label: "Retirada" },
          ]}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-desconto">Desconto (R$)</Label>
        <Input id="edit-desconto" name="desconto" type="number" step="0.01" min="0" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
      </div>

      <FormSecaoTitulo>Fiscal e documentos</FormSecaoTitulo>

      <div className="flex items-center space-x-2 rounded-controle h-10 px-3 bg-poco self-end">
        <Checkbox name="temNota" id="edit-temNota" defaultChecked={editVenda.temNota} />
        <label htmlFor="edit-temNota" className="text-xs font-medium text-foreground leading-none cursor-pointer">
          Com Nota Fiscal
        </label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-taxaNota">Taxa da Nota (%)</Label>
        <Input id="edit-taxaNota" name="taxaNota" type="number" step="0.01" defaultValue={editVenda.taxaNota || 5.97} />
      </div>
      <div className="space-y-1">
        <Label>Comprovante Assinado</Label>
        <div className="flex flex-col gap-2">
          <Input type="file" name="comprovante" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="h-10 px-2 pt-1.5" aria-label="Upload de comprovante assinado" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <a href={`/api/comprovante?vendaId=${editVenda.id}`} target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1 hover:text-foreground" aria-label={`Ver comprovante assinado da venda #${editVenda.id}`}>
              Ver comprovante assinado <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="md:col-span-3 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" loading={loading}>
          Salvar alterações
        </Button>
        <ReciboDownloadLink
          vendaId={editVenda.id}
          tipo={editVenda.descontoEmFolha ? "autorizacao" : "venda"}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          label={editVenda.descontoEmFolha ? "Autorização" : "Baixar recibo PDF"}
        />
        {editVenda.boletoUrl ? (
          <a
            href={editVenda.boletoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver boleto Asaas
          </a>
        ) : editVenda.boleto ? (
          <GerarBoletoButton vendaId={editVenda.id} gerarBoletoAction={gerarBoletoAction}>
            Gerar boleto Asaas
          </GerarBoletoButton>
        ) : null}
      </div>

      {/* Acao destrutiva numa linha propria, separada do salvar, para nao ficar
          encostada nele (D-05). */}
      <div className="md:col-span-3">
        <Separator />
        <div className="flex justify-end pt-4">
          <DeleteVendaButton vendaId={editVenda.id} deleteAction={deleteAction} />
        </div>
      </div>
    </form>
  );
}
