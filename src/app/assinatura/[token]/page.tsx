'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
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

export default function AssinaturaPage() {
  const { token } = useParams();
  const [venda, setVenda] = useState<VendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);

  useEffect(() => {
    if (wrapperRef.current) {
      setCanvasWidth(wrapperRef.current.clientWidth);
    }
  }, []);

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
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError('Por favor, assine no campo acima antes de enviar.');
      return;
    }
    setError(null);
    setSubmitting(true);
    fetch('/api/assinatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') }),
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
              <h2 className="text-xl font-bold">Assinatura enviada com sucesso!</h2>
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
              <h2 className="text-xl font-bold">Não foi possível carregar</h2>
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
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <p>Venda não encontrada.</p>
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
              <p><span className="font-medium text-muted-foreground">Cliente:</span> {venda.cliente?.nome || '—'}</p>
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
              <div ref={wrapperRef} className="w-full rounded-md border bg-white" style={{ touchAction: 'none' }}>
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    width: canvasWidth || 300,
                    height: 200,
                    className: 'rounded-md',
                    style: { width: '100%', height: '200px' },
                  }}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => sigCanvas.current?.clear()} disabled={submitting}>
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
