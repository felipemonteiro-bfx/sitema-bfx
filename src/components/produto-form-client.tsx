'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/form-select";
import { Loader2, Camera, CheckCircle2, AlertCircle, Tag } from "lucide-react";
import Image from 'next/image';

interface Props {
  onSuccess: (formData: FormData) => Promise<void>;
  fornecedores: { id: number; nome: string }[];
}

export default function ProdutoFormClient({ onSuccess, fornecedores }: Props) {
  const [nome, setNome] = useState('');
  const [custo, setCusto] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ncm, setNcm] = useState('');
  const [valor, setValor] = useState('');
  const [imagemPath, setImagemPath] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ncmSuggestions, setNcmSuggestions] = useState<{ codigo: string; descricao: string }[]>([]);
  const [isSearchingNcm, setIsSearchingNcm] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const ncmTimer = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete e verificação de duplicidade
  useEffect(() => {
    if (nome.length < 2) {
      setSuggestions([]);
      setIsDuplicate(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/produtos/autocomplete?q=${encodeURIComponent(nome)}`);
        const data = await res.json();
        setSuggestions(data.matches || []);
        setIsDuplicate(data.isDuplicate || false);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [nome]);

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
      } catch (error) {
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

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/produtos/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setImagemPath(data.filePath);
      }
    } catch (error) {
      alert("Erro no upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('custo', custo);
    formData.append('marca', marca);
    formData.append('categoria', categoria);
    formData.append('ncm', ncm);
    formData.append('valor', valor);
    formData.append('imagem', imagemPath);
    formData.append('fornecedorId', fornecedorId);

    try {
      await onSuccess(formData);
      setNome('');
      setCusto('');
      setMarca('');
      setCategoria('');
      setNcm('');
      setValor('');
      setImagemPath('');
      setFornecedorId('');
      setSuggestions([]);
      setIsDuplicate(false);
      setNcmSuggestions([]);
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
            <div className="relative w-full aspect-square rounded-xl border border-dashed flex items-center justify-center bg-muted/20 hover:bg-muted/30 transition">
              {imagemPath ? (
                <Image
                  src={imagemPath}
                  alt="Produto"
                  fill
                  className="object-cover rounded-xl"
                />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <Input type="file" onChange={handleImageUpload} disabled={isUploading} />
          </div>
        </div>

        <div className="md:col-span-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1 relative">
              <Label className="text-xs font-semibold text-muted-foreground">Nome do produto</Label>
              <div className="relative">
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Teclado Mecânico RGB"
                  className={isDuplicate ? "border-amber-500" : ""}
                />
                {isDuplicate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[10px] font-bold">Já existe!</span>
                  </div>
                )}
              </div>

              {/* Sugestões de Autocomplete */}
              {/* ... */}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Eletrônicos" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Marca</Label>
              <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Custo (R$)</Label>
              <Input type="number" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Valor de Venda (R$)</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
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
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">NCM</Label>
              <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="8 dígitos" maxLength={8} />
              <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                <div className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
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
                        <span className="rounded bg-background px-2 py-1 font-semibold text-slate-900">
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

      <div className="flex items-center justify-end">
        <Button disabled={isSubmitting || isUploading || isDuplicate} type="submit" className="bg-primary hover:bg-primary/90">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Cadastrar Produto
        </Button>
      </div>
    </form>
  );
}
