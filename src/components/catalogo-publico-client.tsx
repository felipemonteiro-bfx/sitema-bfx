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
      <div className="flex h-full items-center justify-center text-foreground dark:text-muted-foreground">
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar produto, marca ou categoria..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl border-border bg-background"
          aria-label="Buscar produtos"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-12 text-center">
          <p className="text-muted-foreground">
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
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm dark:shadow-elevacao-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-elevacao-lg hover:border-info"
            >
              <div className="relative aspect-square bg-muted dark:bg-background">
                <ProdutoImagem src={imgPath} alt={p.nome} />
                {p.categoria && (
                  <span className="absolute left-3 top-3 rounded-lg bg-primary/90 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground dark:bg-primary/80">
                    {p.categoria}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                {p.marca && (
                  <span className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {p.marca}
                  </span>
                )}
                <h2 className="mb-3 line-clamp-2 text-base font-bold leading-snug text-foreground">
                  {p.nome}
                </h2>
                <div className="mt-auto pt-4 border-t border-border">
                  <span className="text-xl font-bold text-primary dark:text-primary">
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
