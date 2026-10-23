// Revisão 2, itens 6 a 13 (achados menores) + foco visível em áreas roláveis.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { agruparMensagens } from '@/app/(app)/crm/atendimento/agrupar-mensagens';
import { indiceAberto, type ItemFoto } from '@/app/(app)/crm/atendimento/fotos-regras';
import { calcularRetomaEm, fraseQuemResponde, mudarQuemResponde, pediuParar } from '@/app/(app)/crm/atendimento/quem-responde-regras';

const DIR = join(process.cwd(), 'src/app/(app)/crm/atendimento');
const fonte = (n: string) => readFileSync(join(DIR, n), 'utf8');

describe('item 6: foto aberta é seguida pelo msgId, não pelo índice', () => {
  const it3 = (ids: number[]) => ids.map(msgId => ({ msgId }) as ItemFoto);
  it('o índice acompanha a foto quando a lista muda', () => {
    expect(indiceAberto(it3([1, 2, 3]), 2)).toBe(1);
    expect(indiceAberto(it3([0, 1, 2, 3]), 2)).toBe(2); // chegou foto antes: o índice anda, a foto é a mesma
  });
  it('foto que sumiu ou nada aberto: null (fecha)', () => {
    expect(indiceAberto(it3([1, 3]), 2)).toBeNull();
    expect(indiceAberto(it3([1, 3]), null)).toBeNull();
  });
  it('o provider guarda msgId e fecha se a foto sumir', () => {
    const s = fonte('fotos-contexto.tsx');
    expect(s).toContain('indiceAberto(');
    expect(s).not.toContain('useState<number | null>(null);\n  const abrir = useCallback((msgId: number) => { const i = indicePorMensagem');
  });
});

describe('item 7: fechar por Responder deixa o foco no campo', () => {
  it('onCloseAutoFocus com preventDefault quando fechou por Responder', () => {
    const s = fonte('visualizador-fotos.tsx');
    expect(s).toContain('onCloseAutoFocus');
    expect(s).toMatch(/onCloseAutoFocus=\{[^}]*preventDefault/);
  });
});

describe('item 8: busca do quadro respeita edição pendente', () => {
  it('o timer da busca confere edicaoPendente(document) e mostra o aviso', () => {
    const s = fonte('kanban.tsx');
    const i = s.indexOf('router.replace(urlDaBuscaDoQuadro');
    const trecho = s.slice(Math.max(0, i - 300), i);
    expect(trecho).toContain('edicaoPendente(document)');
    expect(trecho).toContain('AVISO_EDICAO_PENDENTE');
  });
});

describe('item 9: Automático responde já marcado não dispara nada', () => {
  it('atual automático + escolha automático = null, sem chamar a ação', async () => {
    const c = vi.fn().mockResolvedValue({ ok: true, message: 'ok' });
    expect(await mudarQuemResponde({ escolha: 'automatico', atual: 'automatico', telefone: '1', controlar: c })).toBeNull();
    expect(c).not.toHaveBeenCalled();
  });
  it('desligado/equipe ainda podem retomar', async () => {
    const c = vi.fn().mockResolvedValue({ ok: true, message: 'ok' });
    await mudarQuemResponde({ escolha: 'automatico', atual: 'equipe', telefone: '1', controlar: c });
    expect(c).toHaveBeenCalledWith('1', true);
  });
});

describe('item 10: retomaEm só na pausa por resposta humana', () => {
  const manualEm = new Date('2026-10-17T12:00:00Z');
  const base = { automaticoLigado: true, pausaAtiva: true, clienteParou: false, manualEm, minutos: 60 };
  it('pausa por resposta humana: horário de volta', () => {
    expect(calcularRetomaEm(base)).toBe('2026-10-17T13:00:00.000Z');
  });
  it('cliente pediu PARAR/SAIR: nunca há retomada por prazo', () => {
    expect(calcularRetomaEm({ ...base, clienteParou: true })).toBeNull();
  });
  it('sem resposta humana, sem pausa ou automático desligado: null', () => {
    expect(calcularRetomaEm({ ...base, manualEm: null })).toBeNull();
    expect(calcularRetomaEm({ ...base, pausaAtiva: false })).toBeNull();
    expect(calcularRetomaEm({ ...base, automaticoLigado: false })).toBeNull();
  });
  it('frase de PARAR', () => {
    expect(pediuParar('Cliente pediu para parar — aguardar VOLTAR')).toBe(true);
    expect(pediuParar('Pausa após resposta humana até 14:00')).toBe(false);
    expect(fraseQuemResponde({ modo: 'equipe', retomaEm: null, clientePediuParar: true }, new Date()))
      .toBe('O cliente pediu para parar. O automático só volta se ele mandar VOLTAR.');
  });
  it('a tela usa o cálculo puro', () => {
    expect(fonte('tela-atendimento.tsx')).toContain('calcularRetomaEm(');
    expect(fonte('quem-responde.tsx')).toContain('pediuParar(');
  });
});

describe('item 11: foto com citação quebra o álbum (como legenda)', () => {
  const midia = { id: 'x', tipo: 'imagem', status: 'salva', legenda: null };
  const foto = (n: number, min: number, citacao?: unknown) => ({ id: n, criadoEm: new Date(Date.UTC(2026, 9, 16, 18, min)), direcao: 'in', tipo: 'imagem', midia, citacao });
  const tipos = (ms: ReturnType<typeof foto>[]) => agruparMensagens(ms, new Date('2026-10-16T19:00:00Z')).flatMap(d => d.itens).map(i => i.tipo);
  it('citada no meio encerra o grupo', () => {
    expect(tipos([foto(1, 0), foto(2, 1, { id: 9 }), foto(3, 2), foto(4, 3), foto(5, 4)])).toEqual(['msg', 'msg', 'msg', 'msg', 'msg']);
  });
  it('a última pode ter citação (é a que aparece); sem citação segue álbum', () => {
    expect(tipos([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3, { id: 9 })])).toEqual(['album']);
    expect(tipos([foto(1, 0), foto(2, 1), foto(3, 2), foto(4, 3)])).toEqual(['album']);
  });
});

describe('item 12: tentar foto de novo mostra o motivo da falha', () => {
  it('BotaoTentarFoto exibe r.message em role=alert quando !r.ok', () => {
    const s = fonte('midia-cliente.tsx');
    const f = s.slice(s.indexOf('export function BotaoTentarFoto'), s.indexOf('export function BotaoTentarDeNovo'));
    expect(f).toContain('role="alert"');
    expect(f).toMatch(/setErro\(r\.ok \? '' : r\.message\)/);
  });
});

describe('item 13 e afins: área rolável focável tem anel de foco', () => {
  it('pdf-visualizador: anel interno', () => {
    expect(fonte('pdf-visualizador.tsx')).toContain('focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring');
  });
  it('nenhum tabIndex={0} com focus-visible:outline-none sem anel substituto', () => {
    const ruins: string[] = [];
    const ler = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === '__tests__' ? [] : ler(join(d, e.name))) : e.name.endsWith('.tsx') ? [join(d, e.name)] : []);
    for (const f of ler(join(process.cwd(), 'src'))) {
      for (const linha of readFileSync(f, 'utf8').split('\n')) {
        if (linha.includes('focus-visible:outline-none') && !linha.includes('focus-visible:ring')) ruins.push(`${f}: ${linha.trim().slice(0, 80)}`);
      }
    }
    expect(ruins).toEqual([]);
  });
  it('form-select: opção destacada também aparece no escuro', () => {
    expect(readFileSync(join(process.cwd(), 'src/components/form-select.tsx'), 'utf8')).toContain('dark:hover:bg-controle-ativo');
  });
});
