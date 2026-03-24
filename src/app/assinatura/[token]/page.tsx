'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type ItemVenda = {
  id: number;
  produtoNome: string;
  quantidade: number;
  valorVenda: number;
  subtotal: number;
};

type VendaData = {
  id: number;
  dataVenda: string;
  valorFrete?: number | null;
  cliente: { nome: string } | null;
  itens: ItemVenda[];
};

function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
  }, []);

  const isEmpty = () => !hasStrokes.current;

  const toDataURL = () => canvasRef.current?.toDataURL('image/png') ?? '';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getPos(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasStrokes.current = true;
    };
    const end = () => { drawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [setupCanvas]);

  return { canvasRef, clear, isEmpty, toDataURL };
}

export default function AssinaturaPage() {
  const { token } = useParams();
  const [venda, setVenda] = useState<VendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const { canvasRef, clear, isEmpty, toDataURL } = useSignatureCanvas();

  useEffect(() => {
    if (token) {
      fetch(`/api/assinatura?token=${token}`)
        .then((res) => {
          if (res.status === 409) {
            setError('Esta venda já foi assinada.');
            return null;
          }
          if (!res.ok) throw new Error('Venda não encontrada ou erro no servidor.');
          return res.json();
        })
        .then((data) => { if (data) setVenda(data); })
        .catch(() => setError('Erro ao carregar os dados da venda.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleSign = () => {
    if (isEmpty()) {
      setError('Por favor, assine no campo acima antes de enviar.');
      return;
    }
    setError(null);
    setSubmitting(true);
    fetch('/api/assinatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature: toDataURL() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao enviar assinatura.');
        return res.json();
      })
      .then(() => setIsSigned(true))
      .catch((err) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const total = venda
    ? venda.itens.reduce((s, i) => s + i.subtotal, 0) + (venda.valorFrete || 0)
    : 0;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando dados da venda...</p>
        </div>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Assinatura enviada com sucesso!</h2>
              <p className="text-sm text-muted-foreground mt-2">Você pode fechar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !venda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Não foi possível carregar</h2>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
            <p className="text-foreground">Venda não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assinatura de Recibo — Venda #{venda.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium text-muted-foreground">Cliente:</span>{' '}
                {venda.cliente?.nome || '—'}
              </p>
              <p>
                <span className="font-medium text-muted-foreground">Data da Venda:</span>{' '}
                {new Date(venda.dataVenda).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Itens da Venda:</p>
              <ul className="space-y-1 text-sm">
                {venda.itens.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.produtoNome}{item.quantidade > 1 ? ` (${item.quantidade}x)` : ''}</span>
                    <span className="tabular-nums">{formatBRL(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-semibold text-sm border-t pt-2 mt-2">
                <span>Total:</span>
                <span className="tabular-nums">{formatBRL(total)}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Assine abaixo para autorizar o desconto em folha:
              </p>
              <canvas
                ref={canvasRef}
                className="w-full rounded-md border bg-white"
                style={{ touchAction: 'none', height: '200px', display: 'block' }}
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={clear} disabled={submitting}>
                Limpar
              </Button>
              <Button type="button" onClick={handleSign} disabled={submitting}>
                {submitting ? 'Enviando...' : 'Assinar e Enviar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
