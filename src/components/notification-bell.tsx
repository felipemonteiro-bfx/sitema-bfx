'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

type Notificacao = {
  id: number;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  link: string | null;
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notificacoes');
      if (!res.ok) return;
      const data: Notificacao[] = await res.json();

      for (const n of data) {
        if (!seenIds.current.has(n.id)) {
          seenIds.current.add(n.id);
          if (seenIds.current.size > data.length) {
            toast.info(n.mensagem);
          }
        }
      }

      setNotifications(data);
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markOneRead = async (id: number) => {
    try {
      await fetch('/api/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // silently ignore
    }
  };

  const markAllRead = async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    try {
      await fetch('/api/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setNotifications([]);
      setOpen(false);
    } catch {
      // silently ignore
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="controle"
          size="icon"
          className="relative size-11 min-h-11 min-w-11 touch-manipulation"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          {/* Ancorado DENTRO da caixa do botao. Com o deslocamento negativo que
              havia aqui, o badge de 16x16 saia 3px para cima e 3px para a
              direita de um botao de 36x36 — medido `clientWidth` 34 contra
              `scrollWidth` 38, nas 21 rotas, nos dois temas, em 1440px e 390px.
              O anel na cor da superficie e o que separa o badge do glifo do
              sino: num botao de 36px com icone de 16px e contador de ate dois
              caracteres a sobreposicao de canto e inevitavel (e e a convencao
              de badge de notificacao) — o que resolve a leitura e o contorno,
              nao empurrar o badge para fora. */}
          {/* Era `h-3.5 min-w-3.5` com `text-[9px]` — 14px de circulo e uma fonte
              abaixo do limite pratico de legibilidade. O circulo cresce junto com
              a fonte (`h-4 min-w-4` + `text-xs`), senao o numero nao caberia.
              Mesmo par usado no contador da navegacao lateral. */}
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-xs font-bold leading-none text-primary-foreground ring-2 ring-controle">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <Button size="inlineXs"
              type="button"
              variant="discretoPlano"
              onClick={markAllRead}
              className="shrink-0"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação pendente.
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                {n.link ? (
                  <a
                    href={n.link}
                    className="block"
                    onClick={() => { markOneRead(n.id); setOpen(false); }}
                  >
                    <p className="text-sm text-foreground">{n.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeAgo(n.criadoEm)}
                    </p>
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="bloco"
                    onClick={() => markOneRead(n.id)}
                    className="items-start"
                  >
                    <p className="text-sm text-foreground">{n.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeAgo(n.criadoEm)}
                    </p>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
