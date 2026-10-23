import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it,vi} from 'vitest';
vi.stubGlobal('React',React);
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(app)/crm/atendimento/kanban-actions',()=>({salvarOrganizacaoConversa:vi.fn()}));
import {OrganizarConversa} from '@/app/(app)/crm/atendimento/kanban';
import {ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';

// Fase J1 do redesign Vantage: nenhum HTML cru onde existe componente da ui.
// O teste lê a FONTE (sem comentários) dos arquivos da fase.
const ARQUIVOS=[
 'src/app/(app)/crm/atendimento/kanban.tsx',
 'src/app/(app)/crm/atendimento/kanban-cartao.tsx',
 'src/app/(app)/crm/atendimento/kanban-barra.tsx',
 'src/app/(app)/crm/atendimento/reply.tsx',
 'src/app/(app)/configuracoes/page.tsx',
 'src/components/empresas-tab-client.tsx',
 'src/components/clientes-tab-client.tsx',
 'src/components/fornecedores-tab-client.tsx',
 'src/components/produto-form-client.tsx',
 'src/components/delete-campanha-button.tsx',
 'src/components/cadastrar-produto-rapido-dialog.tsx',
 'src/app/(app)/perfil/page.tsx',
 'src/components/logo-upload-form.tsx',
 'src/components/regras-empresa-section.tsx',
];
function fonte(arq:string){
 const bruto=readFileSync(join(process.cwd(),arq),'utf8');
 return bruto.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
}
// Texto de cada tag aberta (até o primeiro ">" que não seja o de "=>").
const tags=(src:string,nome:string)=>src.match(new RegExp('<'+nome+'(?=[\\s>/])[\\s\\S]*?[^=]>','g'))??[];

describe('J1 - sem HTML cru',()=>{
 for(const arq of ARQUIVOS){
  describe(arq,()=>{
   const src=fonte(arq);
   it('sem select/label/textarea/table/hr crus',()=>{
    for(const t of ['select','label','textarea','table','hr'])expect(tags(src,t),'<'+t).toEqual([]);
   });
   it('button só com buttonVariants',()=>{
    for(const b of tags(src,'button')){
     expect(b).toContain('buttonVariants(');
     // Com onClick o botão é de componente client: usa <Button>, não a classe.
     expect(b,'botão com onClick deve ser <Button>').not.toContain('onClick');
    }
   });
   it('input só hidden/file/checkbox',()=>{
    for(const i of tags(src,'input'))expect(i).toMatch(/type="(hidden|file|checkbox)"/);
   });
  });
 }
 it('exceções de input têm justificativa no código',()=>{
  for(const arq of ARQUIVOS){
   const bruto=readFileSync(join(process.cwd(),arq),'utf8');
   if(tags(fonte(arq),'input').length)expect(bruto,arq).toMatch(/exce[cç][ãa]o leg[ií]tima/i);
  }
 });
});

describe('J1 - envio dos selects do kanban (mesmo FormData de antes)',()=>{
 const base={telefone:'5511999990000',nome:'Cliente',ultimaMensagem:'x',revisao:0,classificado:true};
 it('responsável vazio vai como "" e etapa com o id atual',()=>{
  const html=renderToStaticMarkup(React.createElement(OrganizarConversa,{pessoas:[{id:3,nome:'Equipe'}],cartao:{...base,estado:ESTADO_KANBAN_INICIAL}}));
  expect(html).toMatch(/<input type="hidden" name="responsavel" value=""/);
  expect(html).toContain(`name="etapa" value="${ESTADO_KANBAN_INICIAL.etapa}"`);
  expect(html).toContain('Sem responsável');
 });
 it('salvar sem alterar preserva o responsável atribuído',()=>{
  const html=renderToStaticMarkup(React.createElement(OrganizarConversa,{pessoas:[{id:3,nome:'Equipe'}],cartao:{...base,estado:{...ESTADO_KANBAN_INICIAL,responsavelId:3,responsavelNome:'Equipe'}}}));
  expect(html).toMatch(/name="responsavel" value="3"/);
 });
 it('responsável removido da lista continua selecionável (revisar atribuição)',()=>{
  const html=renderToStaticMarkup(React.createElement(OrganizarConversa,{pessoas:[],cartao:{...base,estado:{...ESTADO_KANBAN_INICIAL,responsavelId:9,responsavelNome:'Ex'}}}));
  expect(html).toMatch(/name="responsavel" value="9"/);
  expect(html).toContain('Ex (revisar atribuição)');
 });
});

describe('J1 - configurações: respostas automáticas',()=>{
 it('Switch com esse name e sem o valor "1" do gateway antigo',()=>{
  const src=fonte('src/app/(app)/configuracoes/page.tsx');
  const comp=fonte('src/components/whatsapp-respostas-auto.tsx');
  expect(src).toContain('name="whatsappPreAtendimento"');
  expect(comp).toMatch(/<input[\s\S]*?type="hidden"[\s\S]*?name=\{name\}/);
  expect(comp).not.toContain('value: "1"');
  expect(src).not.toContain('value: "1", label');
 });
});
