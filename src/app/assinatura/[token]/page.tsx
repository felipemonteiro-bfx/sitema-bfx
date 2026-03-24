'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, PenLine, X } from 'lucide-react';

type VendaInfo = {
  id: number;
  cliente: { nome: string } | null;
};

export default function AssinaturaPage() {
  const { token } = useParams();
  const [venda, setVenda] = useState<VendaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);
  const [canvasHeight, setCanvasHeight] = useState(500);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 120);
  }, [modalOpen]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/assinatura?token=${token}`)
      .then((res) => {
        if (res.status === 409) { setError('Esta venda já foi assinada.'); return null; }
        if (!res.ok) throw new Error('Venda não encontrada ou erro no servidor.');
        return res.json();
      })
      .then((data) => { if (data) setVenda({ id: data.id, cliente: data.cliente }); })
      .catch(() => setError('Erro ao carregar os dados da venda.'))
      .finally(() => setLoading(false));
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
    if (!signatureDataUrl) { setError('Por favor, assine o documento antes de enviar.'); return; }
    setError(null);
    setSubmitting(true);
    fetch('/api/assinatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature: signatureDataUrl }),
    })
      .then((res) => { if (!res.ok) throw new Error('Falha ao enviar assinatura.'); return res.json(); })
      .then(() => setIsSigned(true))
      .catch((err) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando documento...</p>
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

  if ((error && !venda) || !venda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Não foi possível carregar</h2>
              <p className="text-sm text-muted-foreground mt-2">{error || 'Venda não encontrada.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* PDF embed — ocupa toda a tela */}
      <div className="flex-1 w-full" style={{ minHeight: '70vh' }}>
        <iframe
          src={`/api/assinatura/${token}/recibo`}
          className="w-full h-full"
          style={{ minHeight: '70vh', border: 'none' }}
          title="Recibo de Autorização"
        />
      </div>

      {/* Barra de ação fixa na parte inferior */}
      <div className="bg-white border-t shadow-lg px-4 py-4">
        {/* Área de assinatura */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={submitting}
            className="w-full max-w-xs"
          >
            <div
              className={`w-full border-2 border-dashed rounded flex items-center justify-center transition-colors min-h-[60px] ${
                signatureDataUrl
                  ? 'border-gray-300 bg-white'
                  : 'border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer'
              }`}
            >
              {signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureDataUrl} alt="Assinatura" className="max-h-[58px] object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-gray-400 py-3">
                  <PenLine className="h-5 w-5" />
                  <span className="text-sm">Toque aqui para assinar</span>
                </div>
              )}
            </div>
            <div className="w-full max-w-xs border-t border-gray-800 mt-1 mx-auto" />
            <p className="text-xs text-gray-600 mt-0.5 text-center">
              {venda.cliente?.nome || 'Assinatura do Cliente'}
            </p>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-2 text-sm text-red-600 justify-center">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 max-w-xs mx-auto">
          {signatureDataUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setSignatureDataUrl(null); sigCanvas.current?.clear(); }}
              disabled={submitting}
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
            {submitting ? 'Enviando...' : 'Enviar Documento Assinado'}
          </Button>
        </div>
      </div>

      {/* Fullscreen signature modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
            <h2 className="font-semibold text-sm">Assine abaixo com o dedo</h2>
            <button type="button" onClick={handleModalCancel} className="p-1 rounded hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 bg-white overflow-hidden" style={{ touchAction: 'none' }}>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                width: canvasWidth,
                height: canvasHeight,
                style: { display: 'block' },
              }}
            />
          </div>

          <div className="flex gap-3 px-4 py-4 bg-white border-t">
            <Button type="button" variant="outline" onClick={() => sigCanvas.current?.clear()} className="flex-1">
              Limpar
            </Button>
            <Button type="button" onClick={handleModalOk} className="flex-1">
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
