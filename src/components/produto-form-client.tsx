'use client';

import { useState, useEffect, useRef, useId, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/form-select";
import { DateInput } from "@/components/ui/date-input";
import { Loader2, Camera, CheckCircle2, AlertCircle, Tag } from "lucide-react";

type ProdutoEdit = {
  id: number;
  nome: string;
  custoPadrao: number | null;
  marca: string | null;
  categoria: string | null;
  ncm: string | null;
  valorVenda: number | null;
  qtdEstoque: number | null;
  imagem: string | null;
  fornecedorId: number | null;
  dataCompra: Date | null;
};

const normalizeProductName = (value: string) => value.toLocaleUpperCase("pt-BR");
const normalizeCadastroText = (value: string) => value.toLocaleUpperCase("pt-BR");

interface Props {
  produto?: ProdutoEdit | null;
  onSuccessAction: (formData: FormData) => Promise<void>;
  onUpdateAction?: (formData: FormData) => Promise<void>;
  fornecedores: { id: number; nome: string }[];
  categoriasExistentes?: string[];
  cancelHref?: string;
  onCancel?: () => void;
  onEditSuccess?: () => void;
}

export default function ProdutoFormClient({
  produto,
  onSuccessAction,
  onUpdateAction,
  fornecedores,
  categoriasExistentes = [],
  cancelHref,
  onCancel,
  onEditSuccess,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(produto && onUpdateAction);
  const categoryListId = useId();

  const [nome, setNome] = useState('');
  const [custo, setCusto] = useState(0);
  const [estoque, setEstoque] = useState('0');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ncm, setNcm] = useState('');
  const [valor, setValor] = useState(0);
  const [imagemPath, setImagemPath] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataCompra, setDataCompra] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ncmSuggestions, setNcmSuggestions] = useState<{ codigo: string; descricao: string }[]>([]);
  const [isSearchingNcm, setIsSearchingNcm] = useState(false);

  const filteredCategorias = useMemo(() => {
    const query = categoria.trim().toLocaleLowerCase("pt-BR");
    if (!query) return categoriasExistentes.slice(0, 12);
    return categoriasExistentes
      .filter((item) => item.toLocaleLowerCase("pt-BR").includes(query))
      .slice(0, 12);
  }, [categoria, categoriasExistentes]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const ncmTimer = useRef<NodeJS.Timeout | null>(null);

  // Preencher formulário no modo edição
  useEffect(() => {
    if (produto) {
      setNome(normalizeProductName(produto.nome || ''));
      setCusto(produto.custoPadrao ?? 0);
      setEstoque(produto.qtdEstoque != null ? String(produto.qtdEstoque) : '0');
      setMarca(normalizeCadastroText(produto.marca || ''));
      setCategoria(normalizeCadastroText(produto.categoria || ''));
      setNcm(normalizeCadastroText(produto.ncm || ''));
      setValor(produto.valorVenda ?? 0);
      setImagemPath(produto.imagem || '');
      setPreviewUrl(null);
      setFornecedorId(produto.fornecedorId != null ? String(produto.fornecedorId) : '');
      setDataCompra(produto.dataCompra ? new Date(produto.dataCompra).toISOString().split('T')[0] : '');
    }
  }, [produto]);

  // Limpar object URL ao desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Autocomplete e verificação de duplicidade
  useEffect(() => {
    if (nome.length < 2) {
      setIsDuplicate(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/produtos/autocomplete?q=${encodeURIComponent(nome)}`);
        const data = await res.json();
        // No modo edição, ignorar duplicidade se o nome for o mesmo do produto atual
        const dup = data.isDuplicate || false;
        setIsDuplicate(isEdit && produto && nome === normalizeProductName(produto.nome) ? false : dup);
      } catch {
        setIsDuplicate(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [nome, isEdit, produto]);

  useEffect(() => {
    if (nome.trim().length < 3) {
      setNcmSuggestions([]);
      return;
    }

    if (ncmTimer.current) clearTimeout(ncmTimer.current);

    ncmTimer.current = setTimeout(async () => {
      setIsSearchingNcm(true);
      try {
        const res = await fetch(`/api/ncm/search?q=${encodeURIComponent(nome)}`);
        const data = await res.json();
        setNcmSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setNcmSuggestions([]);
      } finally {
        setIsSearchingNcm(false);
      }
    }, 500);

    return () => {
      if (ncmTimer.current) clearTimeout(ncmTimer.current);
    };
  }, [nome]);

  // Upload de Imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview instantâneo antes do upload
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/produtos/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.filePath) {
        setImagemPath(data.filePath);
        URL.revokeObjectURL(objUrl);
        setPreviewUrl(null);
      } else {
        toast.error(data.error || "Falha no upload da imagem.");
      }
    } catch {
      toast.error("Erro no upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNome = normalizeProductName(nome.trim());
    if (!normalizedNome) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('nome', normalizedNome);
    formData.append('custo', String(custo));
    formData.append('marca', normalizeCadastroText(marca.trim()));
    formData.append('categoria', normalizeCadastroText(categoria.trim()));
    formData.append('ncm', normalizeCadastroText(ncm.trim()));
    formData.append('valor', String(valor));
    formData.append('estoque', estoque);
    formData.append('imagem', imagemPath);
    formData.append('fornecedorId', fornecedorId);
    formData.append('dataCompra', dataCompra);

    const action = isEdit && onUpdateAction && produto ? onUpdateAction : onSuccessAction;
    if (isEdit && produto) {
      formData.append('id', String(produto.id));
    }

    try {
      await action(formData);
      if (isEdit && onEditSuccess) {
        toast.success("Produto atualizado com sucesso!");
        onEditSuccess();
      } else if (isEdit && cancelHref) {
        toast.success("Produto atualizado com sucesso!");
        router.push(cancelHref);
        router.refresh();
      } else if (!isEdit) {
        toast.success("Produto cadastrado com sucesso!");
        setNome('');
        setCusto(0);
        setEstoque('0');
        setMarca('');
        setCategoria('');
        setNcm('');
        setValor(0);
        setImagemPath('');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setFornecedorId('');
        setDataCompra('');
        setIsDuplicate(false);
        setNcmSuggestions([]);
      }
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Imagem do Produto</Label>
              <div className="relative w-full aspect-square rounded-xl border border-dashed flex items-center justify-center bg-muted/20 hover:bg-muted/30 transition overflow-hidden">
              {(previewUrl || imagemPath) ? (
                <Image
                  src={previewUrl || imagemPath}
                  alt="Produto"
                  fill
                  unoptimized
                  className="absolute inset-0 object-cover rounded-xl"
                />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="h-auto min-h-10 w-full py-2 text-xs file:mr-2"
            />
          </div>
        </div>

        <div className="md:col-span-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1 relative">
              <Label className="text-xs font-semibold text-muted-foreground">Nome do produto</Label>
              <div className="relative">
                <Input
                  value={nome}
                  onChange={(e) => setNome(normalizeProductName(e.target.value))}
                  placeholder="Ex: Teclado Mecânico RGB"
                  className={cn("uppercase", isDuplicate ? "border-warning" : "")}
                />
                {isDuplicate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-warning-text">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-bold">Já existe!</span>
                  </div>
                )}
              </div>

              {/* Sugestões de Autocomplete */}
              {/* ... */}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(normalizeCadastroText(e.target.value))}
                placeholder="Ex: Eletrônicos"
                list={categoryListId}
                className="uppercase"
              />
              <datalist id={categoryListId}>
                {filteredCategorias.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <div className="text-xs text-muted-foreground">
                Sugere categorias já cadastradas, mas você pode digitar uma nova se precisar.
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Marca</Label>
              <Input value={marca} onChange={(e) => setMarca(normalizeCadastroText(e.target.value))} placeholder="Marca" className="uppercase" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Custo (R$)</Label>
              <CurrencyInput value={custo} onChange={setCusto} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Valor de Venda (R$)</Label>
              <CurrencyInput value={valor} onChange={setValor} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Qtd em Estoque</Label>
              <Input type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Fornecedor</Label>
              <FormSelect
                name="fornecedorId"
                value={fornecedorId}
                onValueChange={setFornecedorId}
                placeholder="Selecione o Fornecedor"
                options={fornecedores.map((f) => ({ value: String(f.id), label: f.nome }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Data da Compra</Label>
              <DateInput
                value={dataCompra}
                onChange={(v) => setDataCompra(v)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">NCM</Label>
              <Input value={ncm} onChange={(e) => setNcm(normalizeCadastroText(e.target.value))} placeholder="8 dígitos" maxLength={8} className="uppercase" />
              <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Possíveis NCMs pelo nome
                  {isSearchingNcm && <span className="ml-auto">Buscando...</span>}
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {ncmSuggestions.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhuma sugestão ainda.</div>
                  ) : (
                    ncmSuggestions.map((item) => (
                      <button
                        key={item.codigo}
                        type="button"
                        className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-muted"
                        onClick={() => setNcm(item.codigo)}
                      >
                        <span className="rounded bg-background px-2 py-1 font-semibold text-foreground">
                          {item.codigo}
                        </span>
                        <span className="text-muted-foreground">{item.descricao}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : cancelHref ? (
          <a href={cancelHref} className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
            Cancelar
          </a>
        ) : null}
        <Button
          disabled={isSubmitting || isUploading || isDuplicate}
          type="submit"
          className="bg-primary hover:bg-primary/90"
          leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        >
          {isEdit ? "Atualizar Produto" : "Cadastrar Produto"}
        </Button>
      </div>
    </form>
  );
}
