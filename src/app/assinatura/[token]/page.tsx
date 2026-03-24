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

type ParcelaVenc = {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
};

type VendaData = {
  id: number;
  dataVenda: string;
  valorFrete?: number | null;
  valorVenda?: number | null;
  quantidade?: number | null;
  parcelas?: number | null;
  valorParcela?: number | null;
  vendedor?: string | null;
  descontoEmFolha?: boolean;
  boleto?: boolean;
  produtoNome?: string | null;
  cliente: { nome: string; cpf?: string | null; cnpj?: string | null; matricula?: string | null } | null;
  itens: ItemVenda[];
  parcelasVencimento?: ParcelaVenc[];
};

const DEFAULT_AUTORIZACAO =
  'RECIBO Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x. Data: {DATA}. Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa.';

function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

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
  const [canvasWidth, setCanvasWidth] = useState(300);
  const [canvasHeight, setCanvasHeight] = useState(500);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    setCanvasWidth(window.innerWidth);
    setCanvasHeight(window.innerHeight - 120);
  }, [modalOpen]);

  useEffect(() => {
    if (token) {
      fetch(`/api/assinatura?token=${token}`)
        .then((res) => {
          if (res.status === 409) { setError('Esta venda já foi assinada.'); return null; }
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

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // ── Loading ──────────────────────────────────────────────────────────────
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

  // ── Success ───────────────────────────────────────────────────────────────
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

  // ── Error (no venda) ──────────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────
  const subtotalProd = venda.itens?.length
    ? venda.itens.reduce((s, i) => s + i.subtotal, 0)
    : (venda.valorVenda ?? 0) * (venda.quantidade ?? 1);
  const frete = venda.valorFrete ?? 0;
  const total = subtotalProd + frete;
  const nParcelas = venda.parcelas || 1;
  const valorParc = venda.valorParcela || (nParcelas > 0 ? total / nParcelas : total);
  const clienteDoc = venda.cliente?.cpf || venda.cliente?.cnpj || 'N/D';
  const produtosTexto = venda.itens?.length
    ? venda.itens.map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ''}`).join(', ')
    : venda.produtoNome || 'N/D';
  const formaPag = venda.boleto
    ? `Boleto ${nParcelas}x`
    : venda.descontoEmFolha
      ? `Desconto em Folha ${nParcelas}x`
      : 'À Vista';

  const autorizacaoTexto = fillTemplate(DEFAULT_AUTORIZACAO, {
    CLIENTE: venda.cliente?.nome || 'N/D',
    MATRICULA: venda.cliente?.matricula || 'N/D',
    PRODUTO: produtosTexto,
    VALOR: formatBRL(total).replace('R$', '').trim(),
    PARCELAS: String(nParcelas),
    DATA: formatDate(venda.dataVenda),
  });

  const parcelas = venda.parcelasVencimento ?? [];

  return (
    <div className="min-h-screen bg-gray-200 py-6 px-3">
      {/* ── PDF-like document ───────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto bg-white shadow-lg text-[13px] text-gray-800" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>

        {/* Header — gray band */}
        <div className="px-10 py-5" style={{ backgroundColor: '#f4f5f7' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[15px] font-bold text-gray-900">BFX Manager</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Autorização de Desconto em Folha</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-700">Recibo #{venda.id}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Data: {formatDate(venda.dataVenda)}</p>
            </div>
          </div>
        </div>

        <div className="px-10 py-6 space-y-5">

          {/* Detalhes da venda */}
          <div>
            <p className="text-[12px] font-bold text-gray-900 mb-2">Detalhes da venda</p>
            {[
              ['Data da compra', formatDate(venda.dataVenda)],
              ['Cliente', venda.cliente?.nome || 'N/D'],
              ['Documento', clienteDoc],
              ['Vendedor', venda.vendedor || 'N/D'],
              ['Produto', produtosTexto],
            ].map(([label, value]) => (
              <p key={label} className="text-[11px] text-gray-700 leading-5">
                {label}: {value}
              </p>
            ))}
          </div>

          <div className="border-t border-gray-200" />

          {/* Valores */}
          <div>
            <p className="text-[12px] font-bold text-gray-900 mb-2">Valores</p>
            {[
              ['Valor do produto', formatBRL(subtotalProd)],
              ['Frete', formatBRL(frete)],
              ['Total', formatBRL(total)],
              [`Parcelas (${nParcelas}x)`, formatBRL(valorParc)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[11px] leading-5">
                <span className="text-gray-700">{label}</span>
                <span className="font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200" />

          {/* Parcelas table */}
          {parcelas.length > 0 && (
            <>
              <div>
                <p className="text-[12px] font-bold text-gray-900 mb-2">Parcelas</p>
                <table className="w-full text-[10px] border border-gray-300">
                  <thead>
                    <tr style={{ backgroundColor: '#2e3d57', color: 'white' }}>
                      <th className="text-right px-2 py-1.5 w-12">Dias</th>
                      <th className="text-left px-2 py-1.5">Data vencimento</th>
                      <th className="text-left px-2 py-1.5">Forma de pagamento</th>
                      <th className="text-right px-2 py-1.5 w-20">Valor</th>
                      <th className="text-left px-2 py-1.5 w-20">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((pv, i) => {
                      const dias = Math.round(
                        (new Date(pv.dataVencimento).getTime() - new Date(venda.dataVenda).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr key={pv.numeroParcela} style={{ backgroundColor: i % 2 !== 0 ? '#f8f8fa' : 'white' }}>
                          <td className="text-right px-2 py-1 text-gray-700 border-b border-gray-200">{dias}</td>
                          <td className="px-2 py-1 text-gray-700 border-b border-gray-200">{formatDate(pv.dataVencimento)}</td>
                          <td className="px-2 py-1 text-gray-700 border-b border-gray-200">{formaPag}</td>
                          <td className="text-right px-2 py-1 font-bold text-gray-900 border-b border-gray-200">{formatBRL(Math.trunc(pv.valorParcela * 100) / 100)}</td>
                          <td className="px-2 py-1 border-b border-gray-200"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200" />
            </>
          )}

          {/* Autorização text */}
          <div>
            <p className="text-[12px] font-bold text-gray-900 mb-2">Autorização</p>
            <p className="text-[10.5px] text-gray-700 leading-5 whitespace-pre-wrap">{autorizacaoTexto}</p>
          </div>

          {/* Footer note */}
          <p className="text-[8px] text-gray-400 pt-2">
            Documento gerado automaticamente pelo BFX Manager.
          </p>

          <div className="border-t border-gray-200" />

          {/* Signature area */}
          <div className="pb-4">
            <div className="flex flex-col items-center gap-1 mt-2">
              {/* Clickable signature zone */}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={submitting}
                className="w-64 flex flex-col items-center"
              >
                <div
                  className={`w-full border-2 border-dashed rounded flex items-center justify-center transition-colors min-h-[56px] ${
                    signatureDataUrl
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {signatureDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signatureDataUrl} alt="Assinatura" className="max-h-[54px] object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400 py-3">
                      <PenLine className="h-5 w-5" />
                      <span className="text-[10px]">Toque aqui para assinar</span>
                    </div>
                  )}
                </div>
                {/* Signature line */}
                <div className="w-full border-t border-gray-900 mt-1" />
                <p className="text-[10px] text-gray-700 mt-0.5">
                  Assinatura: {venda.cliente?.nome || '________________________'}
                </p>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm text-red-600 justify-center">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4 justify-center">
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
                className="px-8"
              >
                {submitting ? 'Enviando...' : 'Enviar Documento Assinado'}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Fullscreen signature modal ──────────────────────────────────────── */}
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
