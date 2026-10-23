import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const variantes=readFileSync('src/components/ui/button-variants.ts','utf8');
const cartao=readFileSync('src/app/(app)/crm/atendimento/kanban-cartao.tsx','utf8');
const kanban=readFileSync('src/app/(app)/crm/atendimento/kanban.tsx','utf8');
const linhaCartao=variantes.split('\n').find(l=>l.includes('bg-card-elevated')&&l.includes('whitespace-normal'))??'';

describe('cartão do quadro: hover discreto e cartão aberto com contorno (artboard)',()=>{
 it('hover não pinta o cartão de verde cheio',()=>{
  expect(linhaCartao).not.toContain('hover:bg-accent');
  expect(linhaCartao).toContain('hover:bg-secondary');
 });
 it('cartão aberto no painel ganha contorno da marca',()=>{
  expect(linhaCartao).toContain('data-[ativo=true]:ring-2');
  expect(cartao).toContain('data-ativo={ativo');
  expect(kanban).toContain('ativo={aberto===c.telefone}');
 });
});
