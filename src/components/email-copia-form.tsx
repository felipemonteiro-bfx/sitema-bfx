"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarEmailCopia } from "@/app/(app)/relatorios/mensais/actions";

interface Props {
  empresaId: number;
  empresaNome: string;
  valor: string | null;
  /** Prefixo do id do campo: a tela desenha a mesma empresa na tabela e no cartão do celular. */
  idPrefixo: string;
  /** No cartão do celular o rótulo "Em cópia" aparece; na tabela ele vem do cabeçalho. */
  rotuloVisivel?: boolean;
}

/** Campo "Em cópia" de uma empresa, com Salvar e o retorno da gravação. */
export function EmailCopiaForm({ empresaId, empresaNome, valor, idPrefixo, rotuloVisivel = false }: Props) {
  const [estado, salvar, salvando] = useActionState(salvarEmailCopia, undefined);
  const [editado, setEditado] = useState(false);
  const inputId = `${idPrefixo}-email-copia-${empresaId}`;
  const erroId = `${inputId}-erro`;
  const erro = estado && !estado.ok && !editado ? estado.erro : null;
  const salvo = estado?.ok && !editado;

  return (
    <form action={salvar} onSubmit={() => setEditado(false)} className="flex flex-col gap-1">
      <input type="hidden" name="empresaId" value={empresaId} />
      <Label htmlFor={inputId} className={rotuloVisivel ? "text-xs text-muted-foreground" : "sr-only"}>
        {rotuloVisivel ? "Em cópia" : `Em cópia para ${empresaNome}`}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          name="emailCopia"
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="nome@prudent.com.br"
          defaultValue={valor ?? ""}
          onChange={() => setEditado(true)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? erroId : undefined}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" size="sm" disabled={salvando}>
          {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar"}
        </Button>
      </div>
      {erro && (
        <p id={erroId} role="alert" className="text-xs text-error-text">
          {erro}
        </p>
      )}
    </form>
  );
}
