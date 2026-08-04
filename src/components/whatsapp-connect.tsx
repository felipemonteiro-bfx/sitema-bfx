'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, RefreshCw, LogOut, Wifi, WifiOff } from 'lucide-react';

type InstanceState = 'open' | 'connecting' | 'close' | 'unknown';

type StatusResult = {
  state: InstanceState;
  qrcode?: string;
};

export function WhatsAppConnect() {
  const [status, setStatus] = useState<StatusResult>({ state: 'unknown' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp');
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error('Erro ao verificar status');
      }
      const data: StatusResult = await res.json();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling a cada 5s enquanto está conectando (aguardando QR scan)
  useEffect(() => {
    if (status.state !== 'connecting') return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [status.state, fetchStatus]);

  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Falha ao conectar.');
      } else {
        setStatus(data);
      }
    } catch {
      setError('Erro ao conectar.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setStatus({ state: 'close' });
    } catch {
      setError('Erro ao desconectar.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando conexão...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        {status.state === 'open' ? (
          <>
            <span className="flex h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-sm font-medium text-success">Conectado</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </>
        ) : status.state === 'connecting' ? (
          <>
            <span className="flex h-2.5 w-2.5 rounded-full bg-warning animate-pulse" />
            <span className="text-sm font-medium text-warning">Aguardando QR Code</span>
            <Wifi className="h-4 w-4 text-warning" />
          </>
        ) : (
          <>
            <span className="flex h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Desconectado</span>
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>

      {/* QR Code */}
      {status.state === 'connecting' && status.qrcode && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → escaneie o QR abaixo:
          </p>
          <div className="inline-block rounded-lg border border-border p-3 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={status.qrcode}
              alt="QR Code WhatsApp"
              className="h-48 w-48 object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground">Atualizando automaticamente a cada 5 segundos...</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {status.state !== 'open' && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleConnect}
            disabled={actionLoading}
            className="gap-2"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            {status.state === 'connecting' ? 'Novo QR Code' : 'Conectar WhatsApp'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading || actionLoading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
        {status.state === 'open' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={actionLoading}
            className="gap-2 text-destructive hover:text-destructive/80"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Desconectar
          </Button>
        )}
      </div>
    </div>
  );
}
