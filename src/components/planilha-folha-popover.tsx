"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormSelect } from "@/components/form-select";
import { IntervaloMesesPicker } from "@/components/intervalo-meses-picker";
import { formatBRL } from "@/lib/utils";
import { mesDaChave } from "@/lib/periodo-meses";
import { resumoPlanilhaFolhaAction, type RespostaResumoFolha } from "@/app/(app)/prudent/actions";

/** Espera antes de pedir a contagem: mudar vários filtros seguidos vira um pedido só. */
const ESPERA_RESUMO_MS = 200;

type Resumo = Extract<RespostaResumoFolha, { ok: true }>["resumo"];

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

/**
 * "Baixar planilha da folha" (2026-09-17, design aprovado): a coluna Desconto
 * de Produto (evento 5002) de uma competência, no modelo da folha do Domínio.
 * O resumo é contado no servidor, pelo mesmo modelo do arquivo.
 */
export function PlanilhaFolhaPopover({ empresas, hoje }: { empresas: string[]; hoje: string }) {
  // Uma opcao por empresa sem diferenciar maiusculas, como o filtro do arquivo.
  const empresasUnicas = [...new Map(empresas.map((e) => [e.trim().toUpperCase(), e.trim()])).values()];
  const [aberto, setAberto] = useState(false);
  const [competencia, setCompetencia] = useState(() => mesDaChave(hoje.slice(0, 7)));
  // O arquivo do Domínio é por empresa: sem "todas"; com mais de uma, a pessoa escolhe.
  const [empresa, setEmpresa] = useState(() => (empresasUnicas.length === 1 ? empresasUnicas[0] : ""));
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [contando, setContando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const pedidoAtual = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    const pedido = ++pedidoAtual.current;
    if (!empresa) {
      setResumo(null);
      setErro("Escolha a empresa.");
      setContando(false);
      return;
    }
    setContando(true);
    const espera = setTimeout(async () => {
      try {
        const resposta = await resumoPlanilhaFolhaAction({ competencia, empresa });
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
          setErro("Não foi possível contar os descontos.");
        }
      } finally {
        if (pedido === pedidoAtual.current) setContando(false);
      }
    }, ESPERA_RESUMO_MS);
    return () => clearTimeout(espera);
  }, [aberto, competencia, empresa]);

  // fetch + blob, e nao navegar para a rota: um erro (400/403/500 em JSON)
  // tiraria o usuario da tela para mostrar o JSON.
  const baixar = async () => {
    const params = new URLSearchParams({ competencia, empresa });
    setBaixando(true);
    try {
      const resposta = await fetch(`/api/relatorios/folha-xlsx?${params.toString()}`);
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        toast.error(corpo?.error ?? "Não foi possível gerar a planilha.");
        return;
      }
      const nome =
        resposta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "folha-desconto-produto.xlsx";
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

  const opcoesEmpresa = empresasUnicas.map((e) => ({ value: e, label: e }));
  const rotulo = "text-sm font-medium text-muted-foreground";
  const semDesconto = resumo !== null && resumo.compradores === 0;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 gap-2 font-semibold sm:h-10">
          <Download className="h-4 w-4 text-primary" />
          Baixar planilha da folha
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-4">
        <div className={rotulo}>Planilha da folha (.xlsx)</div>
        <p className="mt-1.5 text-sm">
          A coluna Desconto de Produto (evento 5002) no modelo da folha do Domínio: uma linha por matrícula, com a soma das
          parcelas do mês.
        </p>

        <div className="mt-3.5 flex flex-col gap-1">
          <label htmlFor="planilha-folha-competencia" className={rotulo}>
            Competência
          </label>
          <IntervaloMesesPicker
            id="planilha-folha-competencia"
            inicio={competencia}
            fim={competencia}
            onChange={(inicio) => {
              if (inicio) setCompetencia(inicio);
            }}
            hoje={hoje}
            unico
          />
        </div>

        <div className="mt-2.5 flex flex-col gap-1">
          <label htmlFor="planilha-folha-empresa" className={rotulo}>
            Empresa
          </label>
          <FormSelect
            id="planilha-folha-empresa"
            name="_planilhaFolhaEmpresa"
            options={opcoesEmpresa}
            value={empresa}
            onValueChange={setEmpresa}
            placeholder="Escolha a empresa"
            searchable={empresasUnicas.length > 5}
            className="h-11 sm:h-10 rounded-controle! border border-input bg-controle dark:bg-controle"
          />
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
            semDesconto ? (
              "Nenhum desconto nessa competência."
            ) : (
              // Um <span> so em volta de tudo: o container e flex com gap, e texto
              // solto ao lado do <span> do valor viraria outro item de flex.
              <span>
                {`${plural(resumo.compradores, "comprador", "compradores")} · `}
                <span className="valor-sensivel">{formatBRL(resumo.total)}</span>
                {" a descontar"}
              </span>
            )
          ) : null}
        </div>

        {!contando && !erro && resumo && resumo.matriculasRepetidas.length > 0 && (
          <div role="status" className="mt-2 flex items-start gap-2 rounded-interno bg-warning-bg px-3 py-2 text-sm text-warning-text">
            <UserSearch className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>
                <span className="font-bold">
                  {plural(resumo.matriculasRepetidas.length, "matrícula em mais de um cadastro.", "matrículas em mais de um cadastro.")}
                </span>{" "}
                As compras entram na mesma linha e o desconto pode cair na pessoa errada.
              </p>
              {resumo.matriculasRepetidas.slice(0, 3).map((m) => (
                <p key={m.matricula} className="mt-1 font-semibold tabular-nums">
                  {/* Sem máscara aqui: neste aviso a matrícula identifica a LINHA repetida da
                      planilha, e é o que o operador precisa ler para corrigir antes do RH. */}
                  {m.matricula} — {m.nomes.length > 1 ? `${m.nomes.slice(0, -1).join(", ")} e ${m.nomes[m.nomes.length - 1]}` : m.nomes[0]}
                </p>
              ))}
              {resumo.matriculasRepetidas.length > 3 && (
                <p className="mt-1">e mais {resumo.matriculasRepetidas.length - 3}.</p>
              )}
            </div>
          </div>
        )}

        {!contando && !erro && resumo && resumo.semMatricula > 0 && (
          <div role="status" className="mt-2 flex items-start gap-2 rounded-interno bg-warning-bg px-3 py-2 text-sm text-warning-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-bold">{resumo.semMatricula.toLocaleString("pt-BR")} sem matrícula.</span> Saem no
              fim, com a matrícula em branco e marcada em amarelo. Preencha no cadastro do cliente.
            </p>
          </div>
        )}

        <div className="mt-3.5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={baixar}
            disabled={!empresa || contando || baixando || semDesconto || Boolean(erro)}
          >
            {baixando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" />}
            {baixando ? "Baixando…" : "Baixar .xlsx"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Entram parcelas em aberto e antecipadas na Prudent. Quitadas por boleto ou baixa manual ficam fora.
        </p>
      </PopoverContent>
    </Popover>
  );
}
