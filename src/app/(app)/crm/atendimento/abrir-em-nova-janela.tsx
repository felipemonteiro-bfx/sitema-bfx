import { ExternalLink } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { urlAtendimento } from './conversa-lista';

export const ROTA_JANELA = '/crm/atendimento/janela';

/**
 * Abre a tela própria do WhatsApp (sem a sidebar do sistema) em outra aba/janela,
 * preservando o telefone, a visão e a busca atuais. Link comum: não depende de JS.
 */
export function AbrirEmNovaJanela({ telefone, visao, q, etapa }: { telefone?: string; visao: string; q: string; etapa?: string }) {
  return <a href={urlAtendimento(ROTA_JANELA, { visao, telefone, q, etapa })} target="_blank" rel="noopener"
    className={`${buttonVariants({ variant: 'outline' })} min-h-11`}>
    <ExternalLink className="size-4" aria-hidden="true" />Abrir em nova janela<span className="sr-only"> (abre em outra aba)</span>
  </a>;
}
