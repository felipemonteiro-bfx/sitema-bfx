'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FormSelect } from "@/components/form-select";

interface Props {
  defaultValue?: string;
  name: string;
}

export function LitellmModelSelect({ defaultValue, name }: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(defaultValue || '');

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/litellm/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models ?? []);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando modelos...
      </div>
    );
  }

  if (models.length === 0) {
    // Fallback: input livre se não conseguiu listar
    return (
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder="gpt-4o, llama-3-8b, qwen..."
        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      />
    );
  }

  const options = [
    ...(defaultValue && !models.includes(defaultValue)
      ? [{ value: defaultValue, label: `${defaultValue} (atual)` }]
      : []),
    ...models.map((m) => ({ value: m, label: m })),
  ];

  return (
    <FormSelect
      name={name}
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Selecione o modelo"
      searchable={models.length > 5}
    />
  );
}
