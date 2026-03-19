"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form-select";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

type Produto = { id: number; nome: string; qtdEstoque: number | null };

export function EstoqueSaidaForm({
  produtos,
  onSaidaAction,
}: {
  produtos: Produto[];
  onSaidaAction: (fd: FormData) => Promise<void>;
}) {
  const produtoOptions = produtos.map((p) => ({
    value: String(p.id),
    label: `${p.nome} (Estoque: ${p.qtdEstoque ?? 0})`,
  }));

  const motivoOptions = [
    { value: "AJUSTE", label: "Ajuste de Inventário" },
    { value: "PERDA", label: "Perda / Avaria" },
    { value: "DEVOLUCAO", label: "Devolução ao Fornecedor" },
  ];

  return (
    <form action={onSaidaAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground">Produto</div>
          <FormSelect
            name="produtoId"
            options={produtoOptions}
            placeholder="Selecione o produto"
            searchPlaceholder="Buscar produto..."
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground">Quantidade</div>
          <Input name="quantidade" type="number" min="1" defaultValue="1" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground">Motivo</div>
          <FormSelect
            name="motivoTipo"
            options={motivoOptions}
            defaultValue="AJUSTE"
            searchable={false}
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground">Observação</div>
          <Input name="observacao" placeholder="Observação (opcional)" />
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button className={cn(buttonVariants(), "bg-red-700 hover:bg-red-600 cursor-pointer")}>
          Registrar Saída
        </button>
      </div>
    </form>
  );
}
