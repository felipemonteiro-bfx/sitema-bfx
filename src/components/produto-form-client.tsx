'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import Image from 'next/image';

interface Props {
  onSuccess: (formData: FormData) => Promise<void>;
}

export default function ProdutoFormClient({ onSuccess }: Props) {
  const [nome, setNome] = useState('');
  const [custo, setCusto] = useState('');
  const [marca, setMarca] = useState('');
  const [ncm, setNcm] = useState('');
  const [valor, setValor] = useState('');
  const [imagemPath, setImagemPath] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Sugerir NCM via IA
  const handleSuggestNcm = async () => {
    if (!nome || nome.length < 3) {
      alert("Digite um nome mais completo para sugerir o NCM.");
      return;
    }

    setIsSuggesting(true);
    try {
      const res = await fetch(`/api/produtos/autocomplete?q=${encodeURIComponent(nome)}&suggestNcm=true`);
      const data = await res.json();
      if (data.suggestedNcm) {
        setNcm(data.suggestedNcm);
      } else {
        alert("Não foi possível sugerir um NCM para este produto.");
      }
    } catch (error) {
      alert("Erro ao sugerir NCM.");
    } finally {
      setIsSuggesting(false);
    }
  };

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
    formData.append('ncm', ncm);
    formData.append('valor', valor);
    formData.append('imagem', imagemPath);

    try {
      await onSuccess(formData);
      // Reset form
      setNome(''); setCusto(''); setMarca(''); setNcm(''); setValor(''); setImagemPath('');
      setSuggestions([]); setIsDuplicate(false);
    } catch (error) {
      alert("Erro ao cadastrar produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Upload de Foto */}
        <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 bg-slate-50 relative group">
          {imagemPath ? (
            <div className="relative w-full aspect-square">
              <Image 
                src={imagemPath} 
                alt="Preview" 
                fill 
                className="object-cover rounded-md"
              />
              <button 
                type="button"
                onClick={() => setImagemPath('')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors">
              {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
              <span className="text-xs font-medium">Adicionar Foto</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          )}
        </div>

        {/* Campos de Texto */}
        <div className="md:col-span-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
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
              {suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                  {suggestions.map((s) => (
                    <div 
                      key={s.id} 
                      className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex justify-between"
                      onClick={() => {
                        setNome(s.nome);
                        setNcm(s.ncm || '');
                        setMarca(s.marca || '');
                        setSuggestions([]);
                      }}
                    >
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-xs text-muted-foreground">{s.marca}</span>
                    </div>
                  ))}
                </div>
              )}
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
              <Label className="text-xs font-semibold text-muted-foreground">NCM</Label>
              <div className="flex gap-2">
                <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="8 dígitos" maxLength={8} />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  title="Sugerir NCM via IA"
                  onClick={handleSuggestNcm}
                  disabled={isSuggesting}
                >
                  {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-purple-600" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button disabled={isSubmitting || isUploading || isDuplicate} type="submit" className="bg-blue-900 hover:bg-blue-800">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Cadastrar Produto
        </Button>
      </div>
    </form>
  );
}
