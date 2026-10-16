"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormSelect } from "@/components/form-select";
import { IntervaloMesesPicker } from "@/components/intervalo-meses-picker";
import { formatBRL } from "@/lib/utils";
import type { ResumoPlanilha } from "@/lib/planilha-controle";
import { resumoPlanilhaControleAction } from "@/app/(app)/prudent/actions";

/** Espera antes de pedir a contagem: mudar vários filtros seguidos vira um pedido só. */
const ESPERA_RESUMO_MS = 200;

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/**
 * "Baixar planilha de controle" (2026-09-11): a base do desconto em folha no
 * formato da planilha da equipe — uma aba por mês de desconto, um bloco por
 * empresa, o status de cada parcela e a coluna K. O resumo é contado no
 * servidor, pelo mesmo modelo do arquivo.
 */
export function PlanilhaControlePopover({ empresas, hoje }: { empresas: string[]; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [empresa, setEmpresa] = useState("todas");
  const [incluirPassados, setIncluirPassados] = useState(true);
  const [resumo, setResumo] = useState<ResumoPlanilha | null>(null);
  const [contando, setContando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const pedidoAtual = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    const pedido = ++pedidoAtual.current;
    setContando(true);
    const espera = setTimeout(async () => {
      try {
        const resposta = await resumoPlanilhaControleAction({
          mesInicio: inicio || undefined,
          mesFim: fim || undefined,
          empresa,
          incluirPassados,
        });
        if (pedido !== pedidoAtual.current) return;
        if (resposta.ok) {
          setResumo(resposta.resumo);
          setErro(null);
        } else {
          setResumo(null);
          setErro(resposta.erro);
        }
      } catch {
        if (pedido === pedidoAtual.current) {
          setResumo(null);
          setErro("Não foi possível contar as parcelas.");
        }
      } finally {
        if (pedido === pedidoAtual.current) setContando(false);
      }
    }, ESPERA_RESUMO_MS);
    return () => clearTimeout(espera);
  }, [aberto, inicio, fim, empresa, incluirPassados]);

  // fetch + blob, e nao navegar para a rota: um erro (400/403/500 em JSON)
  // tiraria o usuario da tela para mostrar o JSON.
  const baixar = async () => {
    const params = new URLSearchParams();
    if (inicio) params.set("mesInicio", inicio);
    if (fim) params.set("mesFim", fim);
    if (empresa !== "todas") params.set("empresa", empresa);
    if (!incluirPassados) params.set("passados", "0");
    setBaixando(true);
    try {
      const resposta = await fetch(`/api/relatorios/controle-xlsx?${params.toString()}`);
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        toast.error(corpo?.error ?? "Não foi possível gerar a planilha.");
        return;
      }
      const nome =
        resposta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "controle-antecipacao-bfx.xlsx";
      const url = URL.createObjectURL(await resposta.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAberto(false);
    } catch {
      toast.error("Não foi possível baixar a planilha. Verifique a conexão e tente de novo.");
    } finally {
      setBaixando(false);
    }
  };

  // Uma opcao por empresa sem diferenciar maiusculas: e assim que o arquivo agrupa os blocos.
  const empresasUnicas = [...new Map(empresas.map((e) => [e.trim().toUpperCase(), e.trim()])).values()];
  const opcoesEmpresa = [{ value: "todas", label: "Todas as empresas" }, ...empresasUnicas.map((e) => ({ value: e, label: e }))];
  const rotulo = "text-sm font-medium text-muted-foreground";
  const semParcelas = resumo !== null && resumo.parcelas === 0;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 gap-2 font-semibold sm:h-10">
          <Download className="h-4 w-4 text-primary" />
          Baixar planilha de controle
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-4">
        <div className={rotulo}>Planilha de controle (.xlsx)</div>
        <p className="mt-1.5 text-sm">
          No formato da planilha da equipe: uma aba por mês de desconto, um bloco por empresa, o status de cada parcela e,
          na coluna K, a soma do que já foi antecipado.
        </p>

        <div className="mt-3.5 flex flex-col gap-1">
          <label htmlFor="planilha-controle-meses" className={rotulo}>
            Meses de desconto
          </label>
          <IntervaloMesesPicker
            id="planilha-controle-meses"
            inicio={inicio}
            fim={fim}
            onChange={(i, f) => {
              setInicio(i);
              setFim(f);
            }}
            hoje={hoje}
          />
        </div>

        <div className="mt-2.5 flex flex-col gap-1">
          <label htmlFor="planilha-controle-empresa" className={rotulo}>
            Empresa
          </label>
          <FormSelect
            id="planilha-controle-empresa"
            name="_planilhaEmpresa"
            options={opcoesEmpresa}
            value={empresa}
            onValueChange={setEmpresa}
            searchable={empresasUnicas.length > 5}
            className="h-11 sm:h-10 rounded-controle! border border-input bg-controle dark:bg-controle"
          />
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <Checkbox
            id="planilha-controle-passados"
            checked={incluirPassados}
            onCheckedChange={(valor) => setIncluirPassados(valor === true)}
          />
          <label htmlFor="planilha-controle-passados" className="text-sm">
            Incluir meses que já passaram
          </label>
        </div>

        <div
          className="mt-3.5 flex min-h-10 items-center gap-2 rounded-interno bg-poco px-3 py-2 text-sm font-medium tabular-nums text-foreground"
          aria-live="polite"
        >
          {contando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Contando…
            </>
          ) : erro ? (
            erro
          ) : resumo ? (
            semParcelas ? (
              "Nenhuma parcela nesses filtros."
            ) : (
              // Um <span> so em volta de tudo: o container e flex com gap, e texto
              // solto ao lado do <span> do valor viraria outro item de flex.
              <span>
                {`${plural(resumo.abas, "aba", "abas")} · ${plural(resumo.parcelas, "parcela", "parcelas")} · `}
                <span className="valor-sensivel">{formatBRL(resumo.valorAntecipado)}</span>
                {" já antecipados"}
              </span>
            )
          ) : null}
        </div>

        <div className="mt-3.5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={baixar}
            disabled={contando || baixando || semParcelas || Boolean(erro)}
          >
            {baixando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" />}
            {baixando ? "Baixando…" : "Baixar .xlsx"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Números contados no servidor. Abas com o nome da planilha da equipe: &ldquo;SETEMBRO 2026&rdquo;.
        </p>
      </PopoverContent>
    </Popover>
  );
}
