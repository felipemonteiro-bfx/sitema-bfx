import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "",
      striped: "[&_tbody_tr:nth-child(odd)]:bg-muted/30",
      bordered: "[&_td]:border [&_th]:border",
      compact: "[&_td]:py-2 [&_th]:py-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  stickyHeader?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, stickyHeader, ...props }, ref) => (
    <div className="relative w-full overflow-auto custom-scrollbar rounded-lg">
      <table
        ref={ref}
        className={cn(tableVariants({ variant }), className)}
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
  }
>(({ className, sticky, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b [&_tr]:bg-muted/40 dark:[&_tr]:bg-muted/20",
      sticky && "sticky top-0 z-10 bg-card backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "[&_tr:last-child]:border-0",
      className
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
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
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSelected, isHighlighted, animated, animationDelay, style, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        "border-b transition-all duration-200",
        "hover:bg-muted/50 dark:hover:bg-muted/30",
        "data-[state=selected]:bg-accent/10 dark:data-[state=selected]:bg-accent/20",
        isHighlighted && "bg-warning/5 dark:bg-warning/10",
        animated && "animate-fade-in-up fill-both",
        className
      )}
      style={{
        ...style,
        ...(animated && animationDelay ? { animationDelay: `${animationDelay}ms` } : {}),
      }}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

type SortDirection = "asc" | "desc" | null

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: SortDirection
  onSort?: () => void
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => {
    const SortIcon = sortDirection === "asc" 
      ? ArrowUp 
      : sortDirection === "desc" 
        ? ArrowDown 
        : ArrowUpDown

    return (
      <th
        ref={ref}
        className={cn(
          "h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground",
          "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
          sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        {sortable ? (
          <div className="flex items-center gap-1.5">
            {children}
            <SortIcon className={cn(
              "h-3.5 w-3.5 transition-opacity",
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

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  highlight?: "success" | "warning" | "error" | "info"
  numeric?: boolean
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, highlight, numeric, ...props }, ref) => {
    const highlightClasses = {
      success: "text-success font-medium",
      warning: "text-warning font-medium",
      error: "text-error font-medium",
      info: "text-info font-medium",
    }

    return (
      <td
        ref={ref}
        className={cn(
          "p-3 align-middle",
          "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
          numeric && "tabular-nums text-right font-mono",
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
}
