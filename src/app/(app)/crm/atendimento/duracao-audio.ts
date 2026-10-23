'use client';
import { useEffect, useState } from 'react';
import { urlMidia } from './status-mensagem';

// Duração por id de mídia, aprendida do próprio arquivo (<audio preload="metadata">). Não há coluna no banco:
// o player registra aqui ao ler os metadados e a citação de voz reaproveita (ou lê só os metadados, sem baixar o áudio).
const conhecidas = new Map<string, number>();

export function registrarDuracao(id: string, segundos: number): void {
  if (Number.isFinite(segundos) && segundos > 0) conhecidas.set(id, segundos);
}

export function useDuracao(id?: string): number | undefined {
  const [duracao, setDuracao] = useState<number | undefined>(id ? conhecidas.get(id) : undefined);
  useEffect(() => {
    if (!id || conhecidas.has(id)) { if (id) setDuracao(conhecidas.get(id)); return; }
    const el = new Audio();
    el.preload = 'metadata';
    el.onloadedmetadata = () => { registrarDuracao(id, el.duration); setDuracao(conhecidas.get(id)); };
    el.src = urlMidia(id);
    return () => { el.onloadedmetadata = null; el.removeAttribute('src'); el.load(); };
  }, [id]);
  return duracao;
}
