'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, PenLine, X } from 'lucide-react';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);
  const [canvasHeight, setCanvasHeight] = useState(500);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    // Use viewport dimensions directly since modal is fullscreen
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 140); // subtract header + footer height
  }, [modalOpen]);

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

  const handleModalOk = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    setSignatureDataUrl(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
    setModalOpen(false);
  };

  const handleModalCancel = () => {
    sigCanvas.current?.clear();
    setSignatureDataUrl(null);
    setModalOpen(false);
  };

  const handleSubmit = () => {
    if (!signatureDataUrl) {
      setError('Por favor, assine o recibo antes de enviar.');
      return;
    }
    setError(null);
    setSubmitting(true);
    fetch('/api/assinatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature: signatureDataUrl }),
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando recibo...</p>
        </div>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Assinatura enviada!</h2>
              <p className="text-sm text-muted-foreground mt-2">Você pode fechar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !venda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
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
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Receipt document */}
      <div className="max-w-lg mx-auto bg-white shadow-md rounded-sm font-mono text-sm">
        {/* Header */}
        <div className="border-b-2 border-black px-6 pt-6 pb-4 text-center">
          <p className="text-xs tracking-widest uppercase text-gray-500 mb-1">Recibo de Autorização</p>
          <h1 className="text-xl font-bold tracking-tight">DESCONTO EM FOLHA</h1>
          <p className="text-xs text-gray-500 mt-1">Nº {String(venda.id).padStart(6, '0')}</p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Sale info */}
          <div className="grid grid-cols-2 gap-1 text-xs border-b border-dashed border-gray-300 pb-3">
            <div>
              <span className="text-gray-500 uppercase tracking-wide">Cliente</span>
              <p className="font-semibold mt-0.5">{venda.cliente?.nome || '—'}</p>
            </div>
            <div className="text-right">
              <span className="text-gray-500 uppercase tracking-wide">Data</span>
              <p className="font-semibold mt-0.5">
                {new Date(venda.dataVenda).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-gray-300 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Itens</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-1 font-medium text-gray-500">Produto</th>
                  <th className="text-center pb-1 font-medium text-gray-500 w-8">Qtd</th>
                  <th className="text-right pb-1 font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                {venda.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="py-0.5">{item.produtoNome}</td>
                    <td className="py-0.5 text-center text-gray-500">{item.quantidade}</td>
                    <td className="py-0.5 text-right tabular-nums">{formatBRL(item.subtotal)}</td>
                  </tr>
                ))}
                {(venda.valorFrete ?? 0) > 0 && (
                  <tr>
                    <td className="py-0.5 text-gray-500 italic" colSpan={2}>Frete</td>
                    <td className="py-0.5 text-right tabular-nums">{formatBRL(venda.valorFrete!)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center border-b-2 border-black pb-3">
            <span className="font-bold uppercase tracking-wide">TOTAL</span>
            <span className="font-bold text-lg tabular-nums">{formatBRL(total)}</span>
          </div>

          {/* Authorization text */}
          <div className="text-xs text-gray-600 leading-relaxed">
            <p>
              Declaro que recebi os produtos acima e autorizo o desconto do valor de{' '}
              <strong>{formatBRL(total)}</strong> em minha folha de pagamento, conforme acordado.
            </p>
          </div>

          {/* Signature area */}
          <div className="pt-2 pb-6">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={submitting}
              className={`w-full border-2 border-dashed rounded-sm flex flex-col items-center justify-center transition-colors min-h-[80px] ${
                signatureDataUrl
                  ? 'border-gray-300 bg-white'
                  : 'border-gray-400 bg-gray-50 hover:bg-gray-100 hover:border-gray-500 cursor-pointer'
              }`}
            >
              {signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureDataUrl}
                  alt="Assinatura"
                  className="max-h-[72px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400 py-4">
                  <PenLine className="h-6 w-6" />
                  <span className="text-xs">Toque aqui para assinar</span>
                </div>
              )}
            </button>

            <div className="mt-1 border-t border-black pt-1">
              <p className="text-[10px] text-center text-gray-500 uppercase tracking-wide">
                {venda.cliente?.nome || 'Assinatura do Cliente'}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pb-4">
            {signatureDataUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setSignatureDataUrl(null); sigCanvas.current?.clear(); }}
                disabled={submitting}
                className="text-xs"
              >
                Refazer
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !signatureDataUrl}
              className="flex-1"
            >
              {submitting ? 'Enviando...' : 'Enviar Recibo Assinado'}
            </Button>
          </div>
        </div>
      </div>

      {/* Full-screen signature modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          {/* Modal header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
            <h2 className="font-semibold text-sm">Assine abaixo</h2>
            <button type="button" onClick={handleModalCancel} className="p-1 rounded hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Canvas area — fills remaining space */}
          <div ref={wrapperRef} className="flex-1 bg-white overflow-hidden" style={{ touchAction: 'none' }}>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                width: canvasWidth || 300,
                height: canvasHeight || 500,
                style: { display: 'block' },
              }}
            />
          </div>

          {/* Modal footer */}
          <div className="flex gap-3 px-4 py-4 bg-white border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => sigCanvas.current?.clear()}
              className="flex-1"
            >
              Limpar
            </Button>
            <Button
              type="button"
              onClick={handleModalOk}
              className="flex-1"
            >
              OK — Confirmar Assinatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
