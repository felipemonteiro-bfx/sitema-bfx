"use client";

/**
 * Seletor de template aprovado para campanhas de WhatsApp.
 *
 * Substitui a antiga caixa de texto livre: a Cloud API só aceita templates
 * pré-aprovados em mensagens business-initiated, então o admin escolhe um da
 * lista e preenche as variáveis.
 */
import { useState } from "react";
import type { TemplateAprovado } from "@/lib/meta-templates";

type Props = {
  templates: TemplateAprovado[];
  /** Server action que refaz a busca na Graph API ignorando o cache. */
  onAtualizar: () => Promise<TemplateAprovado[]>;
};

/** Substitui {{1}}, {{2}}, ... pelos valores digitados. */
function renderPreview(corpo: string, valores: string[]): string {
  let out = corpo;
  valores.forEach((v, i) => {
    out = out.split("{{" + (i + 1) + "}}").join(v || `{{${i + 1}}}`);
  });
  return out;
}

export function CampanhaTemplatePicker({ templates, onAtualizar }: Props) {
  const [lista, setLista] = useState(templates);
  const [nome, setNome] = useState("");
  const [valores, setValores] = useState<string[]>([]);
  const [atualizando, setAtualizando] = useState(false);

  const selecionado = lista.find((t) => t.nome === nome) ?? null;

  function escolher(novoNome: string) {
    setNome(novoNome);
    const t = lista.find((x) => x.nome === novoNome);
    setValores(new Array(t?.variaveis ?? 0).fill(""));
  }

  async function atualizar() {
    setAtualizando(true);
    try {
      const novos = await onAtualizar();
      setLista(novos);
      if (!novos.some((t) => t.nome === nome)) {
        setNome("");
        setValores([]);
      }
    } finally {
      setAtualizando(false);
    }
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-md border border-warning bg-warning-bg p-3 text-sm">
        <p>
          Nenhum template aprovado na Meta. Aprove um template no WhatsApp Manager
          antes de criar campanhas.
        </p>
        <button
          type="button"
          onClick={atualizar}
          disabled={atualizando}
          className="mt-2 underline"
        >
          {atualizando ? "Atualizando..." : "Atualizar lista"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">Template</span>
          <select
            name="templateNome"
            value={nome}
            onChange={(e) => escolher(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Selecione um template aprovado</option>
            {lista.map((t) => (
              <option key={t.nome} value={t.nome}>
                {t.nome} — {t.categoria}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={atualizar}
          disabled={atualizando}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {atualizando ? "..." : "Atualizar"}
        </button>
      </div>

      {selecionado && selecionado.variaveis > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Variáveis</legend>
          {valores.map((v, i) => (
            <input
              key={i}
              name="variaveis"
              value={v}
              onChange={(e) => {
                const novos = [...valores];
                novos[i] = e.target.value;
                setValores(novos);
              }}
              required
              placeholder={`{{${i + 1}}} — use {nome} ou {primeiroNome}`}
              className="w-full rounded-md border px-3 py-2"
            />
          ))}
        </fieldset>
      )}

      {selecionado && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="mb-1 font-medium">Prévia</p>
          <p className="whitespace-pre-wrap">
            {renderPreview(selecionado.corpo, valores)}
          </p>
        </div>
      )}
    </div>
  );
}
