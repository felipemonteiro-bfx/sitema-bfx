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
      <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <h1 className="sr-only">Assinatura de autorização — BFX</h1>
          <p className="text-muted-foreground text-sm">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success-text mx-auto" />
            <div>
              <h1 className="text-xl font-bold">Parabéns pela compra!</h1>
              <p className="text-sm text-muted-foreground mt-2">Contrato enviado para a BFX.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((error && !venda) || !venda) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <AlertCircle className="h-16 w-16 text-warning-text mx-auto" />
            <div>
              <h1 className="text-xl font-bold">Não foi possível carregar</h1>
              <p className="text-sm text-muted-foreground mt-2">{error || 'Venda não encontrada.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {/* O <h1> e visualmente oculto: a tela e um visualizador de PDF em tela
          cheia, sem espaco para cabecalho, mas o leitor de tela precisa anunciar
          do que se trata antes do iframe. */}
      <h1 className="sr-only">Assinatura de autorização — BFX</h1>

      {/* PDF iframe — ocupa todo espaço restante */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <iframe
          src={`/api/assinatura/${token}/recibo`}
          className="block h-full w-full border-0"
          title="Recibo de Autorização"
        />
      </div>

      {/* Barra inferior — altura fixa, sempre visível. Superfície do tema (painel);
          só o quadro da assinatura é branco fixo, porque a tinta é sempre preta. */}
      <div
        className="shrink-0 border-t border-painel-borda bg-card px-4 pt-3 pb-area-segura"
      >
        {/* Área de assinatura */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setModalOpen(true)}
          disabled={submitting}
          className="mb-2 h-auto w-full flex-col items-stretch justify-start gap-0 whitespace-normal p-0 font-normal hover:bg-transparent touch-manipulation"
        >
          {/* Quadro branco fixo (Fase 14, D-06): a tinta da assinatura (SignatureCanvas/penColor)
              é sempre preta — se o fundo virasse escuro no tema dark, o traço ficaria ilegível. */}
          <span
            className={`flex min-h-[60px] w-full items-center justify-center rounded-controle border-2 border-dashed transition-colors ${
              signatureDataUrl
                ? 'border-border bg-white'
                : 'border-primary bg-marca-tint active:bg-accent'
            }`}
          >
            {signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureDataUrl} alt="Assinatura" className="max-h-[56px] object-contain" />
            ) : (
              <span className="flex items-center gap-2 py-3 text-marca-tint-texto">
                <PenLine className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Toque aqui para assinar</span>
              </span>
            )}
          </span>
          <span className="mt-1 block w-full border-t border-foreground" />
          <span className="mt-0.5 block text-center text-xs text-muted-foreground">
            {venda.cliente?.nome || 'Assinatura do Cliente'}
          </span>
        </Button>

        {error && (
          <div className="flex items-center gap-2 mb-2 text-xs text-error-text">
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
        <div className="fixed inset-0 z-50 flex flex-col bg-card">
          <div
            className="flex shrink-0 items-center justify-between border-b border-painel-borda bg-card px-4 py-area-segura-topo"
          >
            <h2 className="font-semibold text-sm">Assine com o dedo</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleModalCancel}
              className="-mr-2 rounded-full touch-manipulation"
              aria-label="Fechar e voltar ao documento"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex-1 touch-none overflow-hidden bg-white" /* quadro branco: tinta preta */>
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
            className="flex shrink-0 gap-3 border-t border-painel-borda bg-card px-4 pt-3 pb-area-segura"
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
