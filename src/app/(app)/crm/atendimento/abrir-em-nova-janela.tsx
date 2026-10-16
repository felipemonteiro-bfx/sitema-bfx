import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { urlAtendimento } from './conversa-lista';

export const ROTA_JANELA = '/crm/atendimento/janela';

/**
 * Abre a tela própria do WhatsApp (sem a sidebar do sistema) em outra aba/janela,
 * preservando o telefone, a visão e a busca atuais. Link comum: não depende de JS.
 * `variante="icone"` é o botão do cabeçalho do chat (recebe o `href` já montado).
 */
export function AbrirEmNovaJanela({ telefone, visao, q, etapa, href, variante = 'texto' }: { telefone?: string; visao?: string; q?: string; etapa?: string; href?: string; variante?: 'texto' | 'icone' }) {
  const destino = href ?? urlAtendimento(ROTA_JANELA, { visao, telefone, q, etapa });
  if (variante === 'icone') {
    return <Button asChild variant="ghost" size="icon"><a href={destino} target="_blank" rel="noopener" aria-label="Abrir em nova janela (abre em outra aba)" title="Abrir em nova janela">
      <ExternalLink className="size-5 text-muted-foreground" aria-hidden="true" /></a></Button>;
  }
  return <a href={destino} target="_blank" rel="noopener"
    className={`${buttonVariants({ variant: 'outline' })} min-h-11`}>
    <ExternalLink className="size-4" aria-hidden="true" />Abrir em nova janela<span className="sr-only"> (abre em outra aba)</span>
  </a>;
}
