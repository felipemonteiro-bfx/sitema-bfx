import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    tamanho: {
      default: "",
      xs: "text-xs",
    },
    mono: {
      true: "tabular-nums",
      false: "",
    },
    /** Células com raio próprio (coluna em destaque): `border-separate` em vez de `collapse`. */
    separado: {
      true: "border-separate border-spacing-0",
      false: "",
    },
    variant: {
      default: "",
      striped: "[&_tbody_tr:nth-child(odd)]:bg-poco",
      bordered: "[&_td]:border [&_td]:border-divisoria [&_th]:border [&_th]:border-divisoria",
      compact: "[&_td]:py-2 [&_th]:py-2",
    },
  },
  defaultVariants: {
    variant: "default",
    tamanho: "default",
    mono: false,
    separado: false,
  },
})

interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  stickyHeader?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, tamanho, mono, separado, stickyHeader, ...props }, ref) => (
    <div className="relative w-full overflow-auto custom-scrollbar table-scroll-touch rounded-interno">
      <table
        ref={ref}
        className={cn(tableVariants({ variant, tamanho, mono, separado }), stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10", className)}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    sticky?: boolean
    /** Fundo do cabeçalho: `poco` (rebaixado do painel) ou `popover` (dentro de popover). */
    fundo?: "poco" | "popover"
  }
>(({ className, sticky, fundo, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      // Vantage: cabecalho sem tarja; a linha `divisoria` ja o separa do corpo.
      "[&_tr]:border-b [&_tr]:border-divisoria",
      fundo === "poco" && "bg-poco",
      fundo === "popover" && "bg-popover",
      sticky && "sticky top-0 z-10 bg-card backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    /** Linha entre as linhas desenhada na célula (para `Table separado`, onde o `<tr>` não tem borda). */
    linhasNasCelulas?: boolean
  }
>(({ className, linhasNasCelulas, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      linhasNasCelulas && "[&_td]:border-t [&_th]:border-t",
      className
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    /** `card` quando o rodapé fica fixo sobre linhas que rolam por baixo (rodapé de popover). */
    fundo?: "card"
  }
>(({ className, fundo, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-divisoria bg-poco font-medium [&>tr]:last:border-b-0",
      fundo === "card" && "bg-card",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean
  isHighlighted?: boolean
  animated?: boolean
  animationDelay?: number
  /** Linha sem realce no hover (cabeçalho, linha de total, linha só de leitura). */
  semHover?: boolean
  /** Linha clicável (cursor de mão). */
  clicavel?: boolean
  /** Linha que não responde mais (já processada): apagada e sem mão. */
  inativa?: boolean
  /** Linha de dado vencido/encerrado: texto em tom secundário. */
  apagada?: boolean
  /** Sem a linha divisória de baixo (linha que se junta à de detalhe aberta). */
  semBorda?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSelected, isHighlighted, animated, animationDelay, semHover, clicavel, inativa, apagada, semBorda, style, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        // Tokens opacos (sem `/opacidade`): o composto escurece o fundo sob o
        // texto e derruba o contraste. `poco` e o degrau rebaixado do painel.
        "border-b border-divisoria transition-colors duration-200",
        semHover ? "hover:bg-transparent" : "hover:bg-poco",
        "data-[state=selected]:bg-marca-tint",
        isHighlighted && "bg-warning-bg",
        clicavel && !inativa && "cursor-pointer",
        inativa && "cursor-default opacity-70",
        apagada && "text-muted-foreground",
        semBorda && "border-b-0",
        animated && "animate-fade-in-up anim-fill-both anim-atraso",
        className
      )}
      style={{
        ...style,
        "--atraso": animated && animationDelay ? `${animationDelay}ms` : undefined,
      } as React.CSSProperties}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

type SortDirection = "asc" | "desc" | null

// Texto do cabeçalho: a tela escolhe tamanho, tom e peso por prop (o lint barra
// `text-*`/`font-*` no className). O padrão é o do Vantage: text-xs, medium, muted.
const tableHeadVariants = cva("", {
  variants: {
    tamanho: { default: "", sm: "text-sm" },
    tom: { default: "", foreground: "text-foreground" },
    peso: { default: "", forte: "font-semibold" },
    fundo: { default: "", card: "bg-card" },
    /** Coluna em destaque (cabeçalho da coluna que o lucro considera). */
    destaque: { default: "", topo: "rounded-t-interno bg-card-elevated font-semibold" },
    /** Cabeçalho clicável de ordenação. */
    interativo: { true: "cursor-pointer select-none transition-colors hover:bg-accent/50", false: "" },
  },
  defaultVariants: { tamanho: "default", tom: "default", peso: "default", fundo: "default", destaque: "default", interativo: false },
})

interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableHeadVariants> {
  sortable?: boolean
  sortDirection?: SortDirection
  onSort?: () => void
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, tamanho, tom, peso, fundo, destaque, interativo, children, ...props }, ref) => {
    const SortIcon = sortDirection === "asc" 
      ? ArrowUp 
      : sortDirection === "desc" 
        ? ArrowDown 
        : ArrowUpDown

    return (
      <th
        ref={ref}
        className={cn(
          "h-11 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
          "[&:has([role=checkbox])]:pr-0",
          sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
          tableHeadVariants({ tamanho, tom, peso, fundo, destaque, interativo }),
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        {sortable ? (
          // `whitespace-nowrap` + `shrink-0` pelo mesmo motivo de
          // `sortable-header.tsx`: este <div> nao usa `buttonVariants`, entao o
          // rotulo quebra em duas linhas e a seta e comprimida pelo flex.
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {children}
            <SortIcon className={cn(
              "h-3.5 w-3.5 shrink-0 transition-opacity",
              sortDirection ? "opacity-100" : "opacity-40"
            )} />
          </div>
        ) : (
          children
        )}
      </th>
    )
  }
)
TableHead.displayName = "TableHead"

// Texto da célula: tom, peso e tamanho por prop (o lint barra `text-*`/`font-*`
// no className). `mono` é número alinhado à esquerda (código, id, data);
// `numeric` é número alinhado à direita (dinheiro, quantidade).
const tableCellVariants = cva("", {
  variants: {
    tom: {
      default: "",
      muted: "text-muted-foreground",
      foreground: "text-foreground",
      erro: "text-error-text",
      sucesso: "text-success-text",
    },
    peso: { default: "", medio: "font-medium", forte: "font-semibold", negrito: "font-bold" },
    tamanho: { default: "", xs: "text-xs", sm: "text-sm", base: "text-base" },
    mono: { true: "font-mono tabular-nums", false: "" },
    truncar: { true: "truncate", false: "" },
    fundo: { default: "", card: "bg-card", elevado: "bg-card-elevated" },
    /** Coluna em destaque: `meio` no corpo, `base` na última linha (fecha o raio). */
    destaque: {
      default: "",
      meio: "bg-card-elevated font-semibold",
      base: "rounded-b-interno bg-card-elevated font-semibold",
    },
  },
  defaultVariants: { tom: "default", peso: "default", tamanho: "default", mono: false, truncar: false, fundo: "default", destaque: "default" },
})

interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableCellVariants> {
  highlight?: "success" | "warning" | "error" | "info"
  numeric?: boolean
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, highlight, numeric, tom, peso, tamanho, mono, truncar, fundo, destaque, ...props }, ref) => {
    // Celula destacada e TEXTO sobre a superficie da tabela (card), nao
    // preenchimento: usa a variante `-text`. Com o token de preenchimento o
    // tema claro media 2.97 / 2.06 / 4.04 / 4.13; com `-text`, 5.18 / 5.23 /
    // 5.60 / 5.22. No escuro os valores sao iguais nos dois casos.
    const highlightClasses = {
      success: "text-success-text font-medium",
      warning: "text-warning-text font-medium",
      error: "text-error-text font-medium",
      info: "text-info-text font-medium",
    }

    return (
      <td
        ref={ref}
        className={cn(
          "p-3 align-middle",
          "[&:has([role=checkbox])]:pr-0",
          numeric && "tabular-nums text-right font-mono",
          tableCellVariants({ tom, peso, tamanho, mono, truncar, fundo, destaque }),
          highlight && highlightClasses[highlight],
          className
        )}
        {...props}
      />
    )
  }
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

interface TableEmptyProps {
  colSpan: number
  message?: string
  description?: string
  icon?: React.ReactNode
}

const TableEmpty = React.forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ colSpan, message = "Nenhum dado encontrado", description, icon }, ref) => (
    <TableRow ref={ref}>
      <TableCell colSpan={colSpan} className="h-32 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          {icon}
          <div className="font-medium">{message}</div>
          {description && (
            <div className="text-sm opacity-70">{description}</div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
)
TableEmpty.displayName = "TableEmpty"

const TableLoading = React.forwardRef<
  HTMLTableRowElement,
  { colSpan: number; rows?: number }
>(({ colSpan, rows = 5 }, ref) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={i} ref={i === 0 ? ref : undefined} animated animationDelay={i * 50}>
        {Array.from({ length: colSpan }).map((_, j) => (
          <TableCell key={j}>
            <div className="h-4 w-full rounded skeleton-base" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
))
TableLoading.displayName = "TableLoading"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
  TableLoading,
  tableVariants,
  tableHeadVariants,
  tableCellVariants,
}
