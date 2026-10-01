"use client";

import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseDataIsoUtc } from "@/lib/data-input";
import { validarDataDescontoUnica } from "@/lib/parcelas";
import {
  avisoMudancaDataDesconto,
  dataDescontoEfetiva,
  escolhaAposSelecionar,
  formatarDataBR,
} from "@/lib/data-desconto-unica";

interface Props {
  id: string;
  /** Data da venda (AAAA-MM-DD): o servidor recusa data do desconto antes dela ou 12 meses depois. */
  dataVenda: string;
  /** Data pela regra da empresa do cliente (AAAA-MM-DD). */
  dataRegra: string;
  /** `null` = acompanha a regra; uma data = mudada à mão. Controlado pelo pai. */
  escolhida: string | null;
  onEscolhidaChange: (escolhida: string | null) => void;
  /** Com `name`, o valor vai no formulário (edição). O PDV monta o FormData à mão e não passa. */
  name?: string;
  /** Motivo de a data não poder mudar (edição). O campo fica desabilitado e não vai no formulário. */
  bloqueio?: string | null;
  labelClassName?: string;
  /** Classe do aviso de mudança, que ocupa a linha inteira do grid do pai. */
  avisoClassName?: string;
}

/**
 * "Data do desconto" da venda 1x em desconto em folha (2026-10-01). Preenchida pela data da regra
 * da empresa e editável; mudada, mostra o link para voltar à regra e o aviso de combinar com o RH.
 * Renderiza dois filhos (campo e aviso) para o pai encaixar no próprio grid.
 * Ver docs/superpowers/specs/2026-10-01-data-desconto-venda-1x.md.
 */
export function DataDescontoUnica({
  id,
  dataVenda,
  dataRegra,
  escolhida,
  onEscolhidaChange,
  name,
  bloqueio,
  labelClassName,
  avisoClassName,
}: Props) {
  const valor = dataDescontoEfetiva(escolhida, dataRegra) ?? dataRegra;
  const editada = escolhida !== null && !bloqueio;
  const venda = parseDataIsoUtc(dataVenda);
  const validacao = venda && !bloqueio ? validarDataDescontoUnica(valor, venda) : null;
  const erro = validacao && !validacao.ok ? validacao.erro : null;
  const aviso = editada && !erro ? avisoMudancaDataDesconto(valor, dataRegra) : null;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id} className={labelClassName}>
          Data do desconto
        </Label>
        <DateInput
          id={id}
          name={bloqueio ? undefined : name}
          value={valor}
          onChange={(v) => onEscolhidaChange(escolhaAposSelecionar(v, dataRegra))}
          disabled={Boolean(bloqueio)}
          required
          className={cn(editada && !erro && "border-primary", erro && "border-error")}
        />
        <p className="text-xs text-muted-foreground">
          {bloqueio ? (
            bloqueio
          ) : (
            <>
              Pela regra da empresa: <span className="tabular-nums">{formatarDataBR(dataRegra)}</span>.
              {editada && (
                <>
                  {" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs font-bold underline underline-offset-4"
                    onClick={() => onEscolhidaChange(null)}
                  >
                    Voltar para a data da regra
                  </Button>
                </>
              )}
            </>
          )}
        </p>
        {erro && (
          <p className="text-xs font-medium text-error-text" role="alert">
            {erro}
          </p>
        )}
      </div>
      {aviso && (
        <p
          role="note"
          className={cn("rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-3 text-sm leading-relaxed text-foreground", avisoClassName)}
        >
          {aviso}
        </p>
      )}
    </>
  );
}
