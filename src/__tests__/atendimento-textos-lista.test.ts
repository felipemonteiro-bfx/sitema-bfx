import { describe, it, expect, vi } from 'vitest';
import { linksComoDominio } from '@/lib/linkificar';
import { previaMensagem } from '@/app/(app)/crm/atendimento/status-mensagem';
import { nomeParaExibir, semNomeSalvo, lerEstadoKanban, ESTADO_KANBAN_INICIAL, SEM_RESPONSAVEL } from '@/lib/whatsapp-kanban';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }), usePathname: () => '/crm/atendimento', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/app/(app)/crm/atendimento/actions', () => ({ responderConversa: vi.fn(), controlarAutomatico: vi.fn() }));

describe('linksComoDominio', () => {
  it('troca a URL por 🔗 domínio e mantém o resto', () => {
    expect(linksComoDominio('Olha essa matéria: https://www.cnet.com/tech/foo?a=1')).toBe('Olha essa matéria: 🔗 cnet.com');
  });
  it('www. sem esquema e vários links', () => {
    expect(linksComoDominio('www.g1.com.br/x e http://exemplo.org/y.')).toBe('🔗 g1.com.br e 🔗 exemplo.org.');
  });
  it('sem link não muda', () => expect(linksComoDominio('oi tudo bem')).toBe('oi tudo bem'));
});

describe('previaMensagem com link', () => {
  it('saída leva Você: e o domínio', () => {
    expect(previaMensagem('out', 'Olha essa matéria: https://www.cnet.com/a/b')).toBe('Você: Olha essa matéria: 🔗 cnet.com');
  });
});

describe('nome do contato sem nome salvo', () => {
  it('telefone puro é sem nome e vira formatado', () => {
    expect(semNomeSalvo('5592994070720', '5592994070720')).toBe(true);
    expect(nomeParaExibir('5592994070720', '5592994070720')).toBe('+55 92 99407-0720');
  });
  it('nome real passa direto', () => {
    expect(semNomeSalvo('Ana Lima', '5592994070720')).toBe(false);
    expect(nomeParaExibir('Ana Lima', '5592994070720')).toBe('Ana Lima');
  });
});

describe('Sem responsável', () => {
  it('padrão e normalização de registros antigos', () => {
    expect(SEM_RESPONSAVEL).toBe('Sem responsável');
    expect(ESTADO_KANBAN_INICIAL.responsavelNome).toBe('Sem responsável');
    const e = lerEstadoKanban(JSON.stringify({ versao: 1, etapa: 'novas', responsavelId: null, responsavelNome: 'Não atribuído', proximaAcao: 'x' }));
    expect(e?.responsavelNome).toBe('Sem responsável');
  });
});

describe('cabeçalho do chat e lista sem nome', () => {
  it('sem nome: telefone formatado uma vez, "Sem nome salvo" e nada de +5592…', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ConversaChat } = await import('@/app/(app)/crm/atendimento/conversa-chat');
    const html = renderToStaticMarkup(React.createElement(ConversaChat, { telefone: '5592994070720', nome: '5592994070720', aberta: true, semResposta: false, estadoAutomatico: 'x', fichaHref: '/f', mensagens: [], agora: new Date('2026-10-16T15:00:00Z'), telefoneExplicito: true, urlLista: '/l', hrefJanela: '/j' }));
    expect(html).toContain('+55 92 99407-0720');
    expect(html).toContain('Sem nome salvo');
    expect(html).not.toContain('+5592994070720');
  });
});
