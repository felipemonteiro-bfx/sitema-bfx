"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/utils";

type Produto = {
  id: number;
  nome: string;
  valorVenda: number | null;
  imagem: string | null;
  marca: string | null;
  categoria: string | null;
};

type Props = {
  produtos: Produto[];
};

function normalizarPathImagem(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string" || !path.trim()) return null;
  const p = path.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

function ProdutoImagem({ src, alt }: { src: string | null; alt: string }) {
  const [erro, setErro] = useState(false);
  const mostrarFallback = !src || erro;
  if (mostrarFallback) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
        <span className="text-sm font-medium italic">Sem foto</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      onError={() => setErro(true)}
      unoptimized={src.startsWith("http")}
    />
  );
}

export function CatalogoPublicoClient({ produtos }: Props) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    if (!query.trim()) return produtos;
    const q = query.toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.marca?.toLowerCase().includes(q) ?? false) ||
        (p.categoria?.toLowerCase().includes(q) ?? false)
    );
  }, [produtos, query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar produto, marca ou categoria..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Buscar produtos"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">
            {query ? "Nenhum produto encontrado para sua busca." : "Nenhum produto cadastrado no catálogo."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => {
            const imgPath = normalizarPathImagem(p.imagem);
            return (
            <article
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                <ProdutoImagem src={imgPath} alt={p.nome} />
                {p.categoria && (
                  <span className="absolute left-3 top-3 rounded-lg bg-blue-900/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-blue-600/90">
                    {p.categoria}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                {p.marca && (
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {p.marca}
                  </span>
                )}
                <h2 className="mb-3 line-clamp-2 text-base font-bold leading-snug text-slate-800 dark:text-slate-100">
                  {p.nome}
                </h2>
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xl font-black text-blue-900 dark:text-blue-400">
                    {formatBRL(p.valorVenda ?? 0)}
                  </span>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
