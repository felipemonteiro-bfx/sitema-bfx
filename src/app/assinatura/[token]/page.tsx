'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, PenLine, X, RotateCcw } from 'lucide-react';

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
  const [canvasHeight, setCanvasHeight] = useState(400);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 140);
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
    if (!signatureDataUrl) { setError('Por favor, assine antes de enviar.'); return; }
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
      <div className="h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Parabéns pela compra!</h2>
              <p className="text-sm text-muted-foreground mt-2">Contrato enviado para a BFX.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((error && !venda) || !venda) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-200">
      {/* PDF iframe — ocupa todo espaço restante */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <iframe
          src={`/api/assinatura/${token}/recibo`}
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
          title="Recibo de Autorização"
        />
      </div>

      {/* Barra inferior — altura fixa, sempre visível */}
      <div
        className="bg-white border-t shadow-2xl shrink-0 px-4 pt-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Área de assinatura */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={submitting}
          className="w-full mb-2 touch-manipulation"
        >
          <div
            className={`w-full border-2 border-dashed rounded-lg flex items-center justify-center transition-colors min-h-[60px] ${
              signatureDataUrl
                ? 'border-gray-300 bg-white'
                : 'border-primary/50 bg-primary/5 active:bg-primary/10'
            }`}
          >
            {signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureDataUrl} alt="Assinatura" className="max-h-[56px] object-contain" />
            ) : (
              <div className="flex items-center gap-2 text-primary/70 py-3">
                <PenLine className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Toque aqui para assinar</span>
              </div>
            )}
          </div>
          <div className="w-full border-t border-gray-700 mt-1" />
          <p className="text-xs text-gray-500 mt-0.5 text-center">
            {venda.cliente?.nome || 'Assinatura do Cliente'}
          </p>
        </button>

        {error && (
          <div className="flex items-center gap-2 mb-2 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          {signatureDataUrl && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => { setSignatureDataUrl(null); sigCanvas.current?.clear(); }}
              disabled={submitting}
              className="shrink-0 touch-manipulation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || !signatureDataUrl}
            className="flex-1 touch-manipulation font-semibold min-h-[48px]"
          >
            {submitting ? 'Enviando...' : 'Enviar Assinado'}
          </Button>
        </div>
      </div>

      {/* Modal de assinatura fullscreen */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div
            className="flex items-center justify-between px-4 bg-white border-b shrink-0"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
          >
            <h2 className="font-semibold text-sm">Assine com o dedo</h2>
            <button
              type="button"
              onClick={handleModalCancel}
              className="p-2 -mr-1 rounded-full hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-white" style={{ touchAction: 'none' }}>
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

          <div
            className="flex gap-3 px-4 pt-3 bg-white border-t shrink-0"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => sigCanvas.current?.clear()}
              className="flex-1 touch-manipulation"
            >
              Limpar
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleModalOk}
              className="flex-1 touch-manipulation font-semibold"
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
