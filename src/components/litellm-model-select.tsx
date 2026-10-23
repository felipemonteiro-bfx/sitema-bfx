'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  defaultValue?: string;
  name: string;
  /** id do input com a URL da instancia LiteLLM (para listar antes de salvar) */
  urlInputId?: string;
  /** id do input com a API key da instancia LiteLLM (para listar antes de salvar) */
  keyInputId?: string;
}

export function LitellmModelSelect({
  defaultValue,
  name,
  urlInputId = 'litellmUrl',
  keyInputId = 'litellmKey',
}: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(defaultValue || '');
  const reqIdRef = useRef(0);

  const fetchModels = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // Le os valores digitados no formulario para listar os modelos mesmo
      // antes de a URL/chave serem salvas no banco.
      const params = new URLSearchParams();
      const urlEl = document.getElementById(urlInputId) as HTMLInputElement | null;
      const keyEl = document.getElementById(keyInputId) as HTMLInputElement | null;
      if (urlEl?.value.trim()) params.set('url', urlEl.value.trim());
      if (keyEl?.value.trim()) params.set('key', keyEl.value.trim());

      const qs = params.toString();
      const res = await fetch(`/api/litellm/models${qs ? `?${qs}` : ''}`);
      const data = await res.json().catch(() => null);
      if (reqId !== reqIdRef.current) return; // resposta obsoleta

      if (!res.ok) {
        setModels([]);
        setError(
          res.status === 401
            ? 'Sessao expirada ou sem permissao de admin.'
            : data?.error || `Falha ao consultar os modelos (HTTP ${res.status}).`
        );
        return;
      }

      const list: string[] = data?.models ?? [];
      setModels(list);
      setError(list.length ? null : data?.error || 'Nenhum modelo retornado por /v1/models.');
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setModels([]);
      setError(e instanceof Error ? e.message : 'Falha ao consultar os modelos.');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [urlInputId, keyInputId]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Recarrega a lista quando a URL ou a chave sao alteradas no formulario.
  useEffect(() => {
    const els = [urlInputId, keyInputId]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const onChange = () => fetchModels();
    els.forEach((el) => el.addEventListener('change', onChange));
    return () => els.forEach((el) => el.removeEventListener('change', onChange));
  }, [fetchModels, urlInputId, keyInputId]);

  const reloadButton = (
    <Button size="inlineXs"
      type="button"
      variant="discretoPlano"
      onClick={fetchModels}
      disabled={loading}
      className="gap-1.5"
    >
      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      Recarregar lista
    </Button>
  );

  if (loading && models.length === 0) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border-2 border-input bg-background text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando modelos...
      </div>
    );
  }

  if (models.length === 0) {
    // Fallback: input livre quando a listagem falhou, com o motivo visivel.
    return (
      <div className="space-y-1.5">
        <Input
          type="text"
          name={name}
          defaultValue={defaultValue}
          placeholder="gpt-4o, llama-3-8b, qwen..."
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">
            {error ?? 'Nao foi possivel listar os modelos.'}
          </span>
          {reloadButton}
        </div>
      </div>
    );
  }

  const options = [
    ...(defaultValue && !models.includes(defaultValue)
      ? [{ value: defaultValue, label: `${defaultValue} (atual)` }]
      : []),
    ...models.map((m) => ({ value: m, label: m })),
  ];

  return (
    <div className="space-y-1.5">
      <FormSelect
        name={name}
        options={options}
        value={value}
        onValueChange={setValue}
        placeholder="Selecione o modelo"
        searchable={models.length > 5}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {models.length} modelo(s) disponivel(is).
        </span>
        {reloadButton}
      </div>
    </div>
  );
}
