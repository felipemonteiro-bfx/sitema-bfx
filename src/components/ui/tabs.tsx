"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Segmentado do Vantage: trilho `controle` com contorno decorativo
      // `divisoria`; o item ativo sobe para `controle-ativo`.
      "inline-flex min-h-12 items-center justify-center rounded-controle border border-divisoria bg-controle p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Sem sombra: a aba ativa se separa do trilho so pela troca de
      // preenchimento (`controle` -> `controle-ativo`) e pelo peso da fonte.
      // A transicao usa o token de movimento do segmentado (220ms).
      "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ring-offset-background transition-[background-color,color] duration-[var(--mov-segmentado)] ease-[var(--mov-curva)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-controle-ativo data-[state=active]:font-semibold data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

/**
 * `TabsList` que rola na horizontal COM pista visual.
 *
 * A rolagem em si ja existia desde a fase 16 (`max-w-full` + `overflow-x-auto`
 * no proprio tablist, para que quem role seja a faixa e nao a PAGINA; e
 * `h-auto min-h-10` porque `overflow-x` diferente de `visible` faz o
 * `overflow-y` computar `auto`, e em barra de rolagem classica a barra
 * horizontal comeria ~15px dos 40px de altura). O que faltava era o usuario
 * SABER que ha mais aba: no macOS a barra e sobreposta e some. Medido em 390px:
 * /financeiro "Estoque" 110px fora da tela, /boletos "Gerar (10)" 111px,
 * /configuracoes "Uber" 70px, /cadastros "Empresas" 42px, /gestao-rh
 * "Contratar" cortada — sem nenhum indicio na tela.
 *
 * As pistas sao puramente decorativas (`aria-hidden`, `pointer-events-none`):
 * nada do comportamento de rolagem, foco ou teclado do Radix muda.
 */
const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const faixa = React.useRef<HTMLDivElement | null>(null)
  const [pistas, setPistas] = React.useState({ esquerda: false, direita: false })

  const medir = React.useCallback(() => {
    const el = faixa.current
    if (!el) return
    const restante = el.scrollWidth - el.clientWidth - el.scrollLeft
    setPistas({ esquerda: el.scrollLeft > 1, direita: restante > 1 })
  }, [])

  React.useEffect(() => {
    const el = faixa.current
    if (!el) return
    medir()
    el.addEventListener("scroll", medir, { passive: true })
    const observador =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir)
    // Observar SO a faixa nao basta: ela e `max-w-full`, entao depois que o
    // conteudo passa de 100% a caixa dela para de mudar e um rotulo que cresce
    // ("Gerar (10)") nunca dispararia o observer — a pista da direita ficaria
    // desatualizada justamente quando passa a ser necessaria. Por isso os
    // gatilhos tambem sao observados, e `children` esta nas dependencias.
    observador?.observe(el)
    for (const filho of Array.from(el.children)) observador?.observe(filho)
    return () => {
      el.removeEventListener("scroll", medir)
      observador?.disconnect()
    }
  }, [medir, children])

  const guardarRef = React.useCallback(
    (no: HTMLDivElement | null) => {
      faixa.current = no
      if (typeof ref === "function") ref(no)
      else if (ref) ref.current = no
    },
    [ref]
  )

  const pista =
    "pointer-events-none absolute inset-y-0 flex w-8 items-center text-muted-foreground transition-opacity duration-200"

  return (
    <div className="relative max-w-full">
      <TabsList
        ref={guardarRef}
        className={cn(
          "h-auto min-h-10 max-w-full justify-start overflow-x-auto overflow-y-hidden",
          className
        )}
        {...props}
      >
        {children}
      </TabsList>
      <span
        aria-hidden
        className={cn(
          pista,
          "left-0 justify-start rounded-l-xl bg-gradient-to-r from-controle to-transparent pl-0.5",
          pistas.esquerda ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </span>
      <span
        aria-hidden
        className={cn(
          pista,
          "right-0 justify-end rounded-r-xl bg-gradient-to-l from-controle to-transparent pr-0.5",
          pistas.direita ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </span>
    </div>
  )
})
ScrollableTabsList.displayName = "ScrollableTabsList"

export { Tabs, TabsList, ScrollableTabsList, TabsTrigger, TabsContent }
