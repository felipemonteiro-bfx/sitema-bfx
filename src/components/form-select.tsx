"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { moverDestaque } from "@/lib/lista-teclado";

type Option = {
  label: string;
  value: string;
  /** Texto curto à direita da opção (ex.: contagem). Opcional. */
  hint?: string;
  /** Classe de cor de uma bolinha antes do rótulo (ex.: `bg-warning`). Opcional. */
  indicador?: string;
};

type FormSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  formId?: string;
  id?: string;
};

export function FormSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  placeholder = "Selecione",
  className,
  searchable = true,
  searchPlaceholder = "Pesquisar...",
  formId,
  id,
}: FormSelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [destaque, setDestaque] = React.useState(-1);
  // O destaque só é pintado depois de uma tecla de navegação: sem isto a lista
  // abria com uma opção em verde sólido e o destaque seguia o mouse, mudando o
  // visual de todas as telas que usam o FormSelect.
  const [viaTeclado, setViaTeclado] = React.useState(false);
  const listaId = React.useId();
  const listaRef = React.useRef<HTMLDivElement>(null);
  const buscaRef = React.useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  // Contagem e bolinha pedem mais largura que um gatilho estreito (ex.: w-28 no
  // CRM); só quem as usa ganha a largura mínima.
  const opcoesRicas = options.some((opt) => opt.hint || opt.indicador);

  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filtered = React.useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const destaqueValido = destaque >= 0 && destaque < filtered.length;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
    setQuery("");
  };

  const aoAbrir = (abrir: boolean) => {
    setOpen(abrir);
    if (abrir) {
      setQuery("");
      setViaTeclado(false);
      setDestaque(Math.max(0, options.findIndex((opt) => opt.value === value)));
    }
  };

  // Setas andam pelas opções sem tirar o foco da busca (aria-activedescendant);
  // Enter escolhe; Esc fecha pelo próprio Popover. Com busca, Home/End ficam
  // para o cursor do texto digitado.
  const aoTeclar = (e: React.KeyboardEvent) => {
    const tecla = e.key;
    const navega =
      tecla === "ArrowDown" || tecla === "ArrowUp" || (!searchable && (tecla === "Home" || tecla === "End"));
    if (navega) {
      e.preventDefault();
      setViaTeclado(true);
      setDestaque((atual) => moverDestaque(atual, filtered.length, tecla as "ArrowDown" | "ArrowUp" | "Home" | "End"));
    } else if (tecla === "Enter" && destaqueValido) {
      e.preventDefault();
      handleValueChange(filtered[destaque].value);
    }
  };

  // Só o teclado rola a lista até a opção: rolar no hover faria a lista pular
  // embaixo do cursor.
  React.useEffect(() => {
    if (!open || !viaTeclado || destaque < 0) return;
    listaRef.current?.querySelector(`[data-indice="${destaque}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, viaTeclado, destaque]);

  const idOpcao = (indice: number) => `${listaId}-opcao-${indice}`;

  // O wrapper nao impoe mais altura minima propria: o gatilho ja e `h-10`,
  // entao a altura minima era redundante no caso comum e nociva quando o call
  // site reduz a altura (`h-7`/`h-9`) — o bloco continuava com 40px, o gatilho
  // encostava no topo e a base ficava 10px acima da do botao irmao ao lado
  // (achado 5 da fase 17).
  return (
    <div className="overflow-hidden">
      <input type="hidden" name={name} value={value} form={formId} />
      <Popover open={open} onOpenChange={aoAbrir}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listaId}
            id={id}
            className={cn(
              // Igual ao Select da ui (Vantage): 44px, rounded-controle, fundo
              // `controle`, contorno `input`, sem sombra.
              "flex h-11 w-full items-center justify-between whitespace-nowrap rounded-controle border border-input bg-controle px-3 py-2 text-sm font-normal text-foreground ring-offset-background hover:border-input hover:bg-controle hover:text-foreground active:scale-100 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted-foreground",
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {selected?.indicador && <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", selected.indicador)} />}
              <span className="line-clamp-1">{selected?.label ?? placeholder}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-[var(--radix-popover-trigger-width)] rounded-interno border bg-popover p-2",
            opcoesRicas && "min-w-56"
          )}
          onKeyDown={aoTeclar}
          onOpenAutoFocus={(e) => {
            // Foco na busca quando existe; senão na lista, para as setas funcionarem.
            e.preventDefault();
            (searchable ? buscaRef.current : listaRef.current)?.focus();
          }}
        >
          {searchable && (
            <div className="mb-2 flex items-center gap-2 border-b border-divisoria pb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={buscaRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDestaque(0);
                }}
                placeholder={searchPlaceholder}
                aria-controls={listaId}
                aria-activedescendant={destaqueValido ? idOpcao(destaque) : undefined}
                className="h-7 border-0 bg-transparent p-0 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )}
          <div
            ref={listaRef}
            id={listaId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={!searchable && destaqueValido ? idOpcao(destaque) : undefined}
            className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain outline-none"
          >
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3 text-sm text-muted-foreground">Nenhum resultado.</div>
            ) : (
              <div className="space-y-0.5">
                {/* exceção shadcn: os <button role="option"> abaixo são itens de listbox, não botões
                    de ação — equivalem ao SelectItem da ui; Button imporia altura, nowrap e foco. */}
                {filtered.map((opt, indice) => (
                  <button
                    key={opt.value}
                    id={idOpcao(indice)}
                    data-indice={indice}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    tabIndex={-1}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center gap-2 rounded-controle py-2 pl-2.5 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      opt.value === value && "bg-accent/50",
                      viaTeclado && indice === destaque && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => {
                      setDestaque(indice);
                      setViaTeclado(false);
                    }}
                    onClick={() => handleValueChange(opt.value)}
                  >
                    {opt.indicador && <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", opt.indicador)} />}
                    <span className="truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums">{opt.hint}</span>
                    )}
                    {opt.value === value && (
                      <span className="absolute right-2 inline-flex h-4 w-4 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
