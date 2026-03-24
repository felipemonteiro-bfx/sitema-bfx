"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { EditVendaComParcelas } from "@/components/edit-venda-com-parcelas";
import { DeleteVendaButton } from "@/components/delete-venda-button";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { ReciboDownloadLink } from "@/components/recibo-download-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

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
  custoProduto: number | null;
  valorVenda: number | null;
  quantidade: number | null;
  produtoNome: string | null;
  parcelas: number | null;
  temNota: boolean;
  taxaNota: number | null;
  descontoEmFolha: boolean | null;
  boleto: boolean | null;
  asaasPaymentId: string | null;
  boletoUrl: string | null;
  itens: ProdutoItem[];
};

type Props = {
  editVenda: EditVendaData;
  editParcelasVenc: Parcela[];
  vendedores: { nomeExibicao: string | null; username: string }[];
  updateAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteAction: (formData: FormData) => Promise<void>;
  gerarBoletoAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  initialTotal: number;
};

export function EditVendaHistoricoForm({
  editVenda,
  editParcelasVenc,
  vendedores,
  updateAction,
  deleteAction,
  gerarBoletoAction,
  initialTotal,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    } catch {
      toast.error("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-4 md:grid-cols-3">
      <input type="hidden" name="id" value={editVenda.id} />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data da venda</label>
        <DateInput name="data" defaultValue={editVenda.dataVenda.toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Vendedor</label>
        <FormSelect
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
        initialTotal={initialTotal}
        dataVenda={editVenda.dataVenda.toISOString().slice(0, 10)}
      />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Frete ao cliente</label>
        <Input name="frete" type="number" step="0.01" defaultValue={editVenda.valorFrete || 0} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Custo de envio</label>
        <Input name="envio" type="number" step="0.01" defaultValue={editVenda.custoEnvio || 0} />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Comprovante Assinado (PDF, JPEG ou PNG)</label>
        <div className="flex flex-col gap-2">
          <Input type="file" name="comprovante" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="h-10 px-2 pt-1.5" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <a href={`/api/comprovante?vendaId=${editVenda.id}`} target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1 hover:text-foreground">
              Ver comprovante assinado (se disponível) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
        <input
          type="checkbox"
          name="temNota"
          id="edit-temNota"
          defaultChecked={editVenda.temNota}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <label htmlFor="edit-temNota" className="text-xs font-medium text-foreground leading-none cursor-pointer">
          Com Nota Fiscal
        </label>
      </div>

      <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
        <input
          type="checkbox"
          name="descontoEmFolha"
          id="edit-descontoEmFolha"
          defaultChecked={editVenda.descontoEmFolha ?? false}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <label htmlFor="edit-descontoEmFolha" className="text-xs font-medium text-foreground leading-none cursor-pointer">
          Desconto em folha
        </label>
      </div>

      <div className="flex items-center space-x-2 border rounded-md h-10 px-3 bg-muted/50 border-border self-end">
        <input
          type="checkbox"
          name="boleto"
          id="edit-boleto"
          defaultChecked={editVenda.boleto ?? false}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <label htmlFor="edit-boleto" className="text-xs font-medium text-foreground leading-none cursor-pointer">
          Boleto
        </label>
      </div>
      <p className="text-xs text-muted-foreground md:col-span-3">Apenas uma das opções: desconto em folha ou boleto.</p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Taxa da Nota (%)</label>
        <Input name="taxaNota" type="number" step="0.01" defaultValue={editVenda.taxaNota || 5.97} />
      </div>

      <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={loading} className={cn(buttonVariants(), "cursor-pointer gap-2")}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
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
        <DeleteVendaButton vendaId={editVenda.id} deleteAction={deleteAction} />
      </div>
    </form>
  );
}
