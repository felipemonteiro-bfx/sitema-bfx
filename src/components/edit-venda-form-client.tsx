"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormCheckbox } from "@/components/form-checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { buttonVariants } from "@/components/ui/button-variants";
import { CurrencyInput } from "@/components/currency-input";
import { ProdutoItemForm } from "@/components/produto-item-form";
import { DeleteVendaButton } from "@/components/delete-venda-button";
import { GerarBoletoButton } from "@/components/gerar-boleto-button";
import { formatBRL, cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { LinkAssinaturaButton } from "@/components/link-assinatura-button";
import { ReciboDownloadLink } from "@/components/recibo-download-link";

type ProdutoItem = {
  id: string;
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
};

type EditVendaData = {
  id: number;
  dataVenda: Date;
  vendedor: string | null;
  valorFrete: number;
  custoEnvio: number;
  parcelas: number | null;
  temNota: boolean;
  taxaNota: number;
  desconto: number;
  descontoEmFolha: boolean;
  boleto: boolean;
  assinaturaToken?: string | null;
  assinatura?: { assinaturaStatus: string | null } | null;
  boletoUrl: string | null;
  itens: Array<{
    id?: number;
    produtoNome: string;
    custoProduto: number;
    valorVenda: number;
    quantidade: number;
    subtotal: number;
  }>;
};

type Props = {
  editVenda: EditVendaData;
  vendedores: { nomeExibicao: string | null; username: string }[];
  updateAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  deleteAction: (formData: FormData) => Promise<void>;
  gerarBoletoAction?: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
};

function buildProdutosFromVenda(v: EditVendaData): ProdutoItem[] {
  if (v.itens && v.itens.length > 0) {
    return v.itens.map((i) => ({
      id: crypto.randomUUID(),
      produtoNome: i.produtoNome,
      custoProduto: i.custoProduto,
      valorVenda: i.valorVenda,
      quantidade: i.quantidade,
      subtotal: i.subtotal,
    }));
  }
  // Venda antiga: campos deprecated
  const p = v as unknown as { produtoNome?: string; quantidade?: number; valorVenda?: number; custoProduto?: number };
  const nome = p.produtoNome || "";
  const qtd = p.quantidade || 1;
  const valor = p.valorVenda || 0;
  const custo = p.custoProduto || 0;
  if (!nome) return [];
  return [
    {
      id: crypto.randomUUID(),
      produtoNome: nome,
      custoProduto: custo,
      valorVenda: valor,
      quantidade: qtd,
      subtotal: valor * qtd,
    },
  ];
}

export function EditVendaFormClient({
  editVenda,
  vendedores,
  updateAction,
  deleteAction,
  gerarBoletoAction,
}: Props) {
  const router = useRouter();
  const [produtos, setProdutos] = useState<ProdutoItem[]>(() =>
    buildProdutosFromVenda(editVenda)
  );
  const [frete, setFrete] = useState(editVenda.valorFrete ?? 0);
  const [envio, setEnvio] = useState(editVenda.custoEnvio ?? 0);
  const [descontoValor, setDescontoValor] = useState(editVenda.desconto ?? 0);
  const [loading, setLoading] = useState(false);

  const subtotalProdutos = produtos.reduce((s, p) => s + p.subtotal, 0);
  const totalVenda = subtotalProdutos + frete - descontoValor;
  const numParcelas = editVenda.parcelas || 1;
  const valorParcela = numParcelas > 0 ? totalVenda / numParcelas : 0;

  const addProduto = () => {
    setProdutos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        produtoNome: "",
        custoProduto: 0,
        valorVenda: 0,
        quantidade: 1,
        subtotal: 0,
      },
    ]);
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) setProdutos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProduto = (index: number, item: ProdutoItem) => {
    setProdutos((prev) => {
      const next = [...prev];
      next[index] = item;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const invalid = produtos.some((p) => !p.produtoNome?.trim() || p.valorVenda < 0 || p.quantidade < 1);
    if (invalid || produtos.length === 0) {
      toast.error("Preencha todos os produtos corretamente.");
      return;
    }

    formData.set("produtos", JSON.stringify(produtos));
    formData.set("frete", String(frete));
    formData.set("envio", String(envio));
    formData.set("desconto", String(descontoValor));

    setLoading(true);
    try {
      const res = await updateAction(formData);
      if (res?.success === false) {
        toast.error(res?.error || "Erro ao salvar.");
        return;
      }
      toast.success("Venda atualizada com sucesso!");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card id="editar-venda" className="scroll-mt-24">
      <CardHeader className="space-y-1">
        <CardTitle>Editando venda #{editVenda.id}</CardTitle>
        <p className="text-sm text-muted-foreground">Ajuste os dados e salve para atualizar o Histórico.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="id" value={editVenda.id} />
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Data da venda</Label>
            <DateInput name="data" defaultValue={editVenda.dataVenda.toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Vendedor</Label>
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

          {/* Produtos - span full width */}
          <div className="md:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Produtos da venda</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProduto} leftIcon={<Plus className="h-4 w-4" />}>
                Adicionar produto
              </Button>
            </div>
            <div className="space-y-4">
              {produtos.map((item, index) => (
                <ProdutoItemForm
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={updateProduto}
                  onRemove={removeProduto}
                  canRemove={produtos.length > 1}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Frete ao cliente</Label>
            <CurrencyInput value={frete} onChange={setFrete} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Custo de envio</Label>
            <CurrencyInput value={envio} onChange={setEnvio} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Desconto (R$)</Label>
            <CurrencyInput value={descontoValor} onChange={setDescontoValor} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Parcelas</Label>
            <Input name="parcelas" type="number" min={1} defaultValue={editVenda.parcelas || 1} />
          </div>

          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Comprovante Assinado (PDF, JPEG ou PNG)</Label>
            <div className="flex flex-col gap-2">
              <Input type="file" name="comprovante" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="h-10 px-2 pt-1.5" />
              {editVenda.assinatura?.assinaturaStatus === "assinado" ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-success-text bg-success/10 px-2 py-1.5 rounded-md border border-success/20">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Comprovante assinado.</span>
                  <a href={`/api/comprovante?vendaId=${editVenda.id}`} target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1 hover:underline">
                    Ver <ExternalLink className="h-3 w-3" />
                  </a>
                  <a href={`/api/comprovante?vendaId=${editVenda.id}`} target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1 hover:underline" title="Abrir para imprimir">
                    Imprimir
                  </a>
                </div>
              ) : editVenda.descontoEmFolha && editVenda.assinaturaToken ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Envie o link ao cliente para assinar online:
                  </div>
                  <LinkAssinaturaButton
                    token={editVenda.assinaturaToken}
                    status={editVenda.assinatura?.assinaturaStatus}
                    label="Copiar link de assinatura"
                    showQr
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-warning-text bg-warning-bg px-2 py-1.5 rounded-md border border-warning">
                  <AlertCircle className="h-3 w-3" />
                  <strong>Atenção:</strong> Vendedor ainda não subiu o PDF assinado.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 border rounded-md h-10 px-3 self-end bg-card">
            <FormCheckbox
              name="temNota"
              id="edit-temNota"
              defaultChecked={editVenda.temNota}
            />
            <label htmlFor="edit-temNota" className="text-xs font-medium leading-none cursor-pointer text-foreground">
              Com Nota Fiscal
            </label>
          </div>
          <div className="flex items-center space-x-2 border rounded-md h-10 px-3 self-end bg-card">
            <FormCheckbox
              name="descontoEmFolha"
              id="edit-descontoEmFolha"
              defaultChecked={editVenda.descontoEmFolha ?? false}
            />
            <label htmlFor="edit-descontoEmFolha" className="text-xs font-medium leading-none cursor-pointer text-foreground">
              Desconto em folha
            </label>
          </div>
          <div className="flex items-center space-x-2 border rounded-md h-10 px-3 self-end bg-card">
            <FormCheckbox
              name="boleto"
              id="edit-boleto"
              defaultChecked={editVenda.boleto ?? false}
            />
            <label htmlFor="edit-boleto" className="text-xs font-medium leading-none cursor-pointer text-foreground">
              Boleto
            </label>
          </div>
          <p className="text-xs text-muted-foreground md:col-span-3">Apenas uma das opções: desconto em folha ou boleto.</p>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Taxa da Nota (%)</Label>
            <Input name="taxaNota" type="number" step="0.01" defaultValue={editVenda.taxaNota || 5.97} />
          </div>

          {/* Resumo */}
          <div className="md:col-span-3 p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal produtos</span>
              <span className="font-semibold">{formatBRL(subtotalProdutos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-semibold">{formatBRL(frete)}</span>
            </div>
            {descontoValor > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="font-semibold text-destructive">-{formatBRL(descontoValor)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatBRL(totalVenda)}</span>
            </div>
            {numParcelas > 1 && (
              <div className="text-xs text-muted-foreground">
                {numParcelas}x de {formatBRL(valorParcela)}
              </div>
            )}
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={loading} className={cn(buttonVariants(), "cursor-pointer")}>
                {loading ? "Salvando..." : "Salvar alterações"}
              </button>
              <ReciboDownloadLink
                vendaId={editVenda.id}
                tipo={editVenda.descontoEmFolha ? "autorizacao" : "venda"}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                label={editVenda.descontoEmFolha ? "Autorização" : "Recibo de Venda"}
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
              ) : editVenda.boleto && gerarBoletoAction ? (
                <GerarBoletoButton vendaId={editVenda.id} gerarBoletoAction={gerarBoletoAction} />
              ) : null}
            </div>
            <DeleteVendaButton vendaId={editVenda.id} deleteAction={deleteAction} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
