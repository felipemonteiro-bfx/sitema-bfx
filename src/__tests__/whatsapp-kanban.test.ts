import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({admin:vi.fn(),user:vi.fn(),find:vi.fn(),create:vi.fn(),lock:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/lib/guards',()=>({requireAdmin:m.admin}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/lib/db',()=>({prisma:{usuario:{findUnique:m.user},$transaction:async(f:(t:unknown)=>unknown)=>f({$executeRaw:m.lock,whatsAppMensagem:{findFirst:m.find,create:m.create}})}}));
import {lerEstadoKanban,movimentoKanban,ESTADO_KANBAN_INICIAL} from '@/lib/whatsapp-kanban';
import {salvarOrganizacaoConversa} from '@/app/(app)/crm/atendimento/kanban-actions';
const telefone='5511999990000';
const input={telefone,etapa:'em_atendimento',responsavelId:3,proximaAcao:'Conferir orçamento',revisao:0};
beforeEach(()=>{vi.resetAllMocks();m.admin.mockResolvedValue(true);m.user.mockResolvedValue({id:3,username:'equipe',nomeExibicao:'Equipe Teste'});m.find.mockImplementation(async(q:{where:{origem?:string}})=>q.where.origem?null:{id:1});m.create.mockResolvedValue({id:90});});
it('não interpreta texto ou JSON externo inválido como organização do quadro',()=>{
 expect(lerEstadoKanban('concluída')).toBeNull();expect(lerEstadoKanban('{"etapa":"concluidas"}')).toBeNull();
 expect(lerEstadoKanban(JSON.stringify({versao:1,etapa:'novas',responsavelId:null,responsavelNome:'Não atribuído',proximaAcao:'Revisar'}))).toMatchObject({etapa:'novas'});
});
it('grava evento interno por conversa e permite reler etapa, responsável e próxima ação',async()=>{
 expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:true});
 const d=m.create.mock.calls[0][0].data;
 expect(d).toMatchObject({telefone,direcao:'sistema',origem:'kanban_controle',status:'controle'});
 expect(lerEstadoKanban(d.corpo)).toMatchObject({etapa:'em_atendimento',responsavelId:3,responsavelNome:'Equipe Teste',proximaAcao:'Conferir orçamento'});
 expect(m.lock).toHaveBeenCalled();
});
it('recusa alteração sem permissão, etapa inválida e próximo passo vazio',async()=>{
 m.admin.mockResolvedValue(false);expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:false});expect(m.find).not.toHaveBeenCalled();m.admin.mockResolvedValue(true);
 expect(await salvarOrganizacaoConversa({...input,etapa:'paga'})).toMatchObject({ok:false});expect(await salvarOrganizacaoConversa({...input,proximaAcao:' '})).toMatchObject({ok:false});expect(m.create).not.toHaveBeenCalled();
});
it('não aceita responsável inventado ou conversa inexistente',async()=>{
 m.user.mockResolvedValue(null);expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:false});m.user.mockResolvedValue({id:3,username:'equipe'});m.find.mockResolvedValue(null);expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:false});expect(m.create).not.toHaveBeenCalled();
});
it('impede sobrescrever uma revisão mais recente de outro atendente',async()=>{
 m.find.mockImplementation(async(q:{where:{origem?:string}})=>q.where.origem?{id:91}:{id:1});
 expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:false});expect(m.create).not.toHaveBeenCalled();
});
it('persiste revisão entre salvamentos e aceita remover atribuição explicitamente',async()=>{
 let atual:{id:number;corpo:string}|null=null;
 m.find.mockImplementation(async(q:{where:{origem?:string}})=>q.where.origem?atual:{id:1});
 m.create.mockImplementation(async(q:{data:{corpo:string}})=>{atual={id:(atual?.id??89)+1,corpo:q.data.corpo};return atual;});
 expect(await salvarOrganizacaoConversa(input)).toMatchObject({ok:true});
 expect(await salvarOrganizacaoConversa({...input,revisao:90,etapa:'aguardando_fornecedor',responsavelId:null,proximaAcao:'Confirmar prazo com fornecedor'})).toMatchObject({ok:true});
 expect(lerEstadoKanban(atual!.corpo)).toMatchObject({etapa:'aguardando_fornecedor',responsavelId:null,proximaAcao:'Confirmar prazo com fornecedor'});
 expect(await salvarOrganizacaoConversa({...input,revisao:90})).toMatchObject({ok:false});
});
it('arrastar altera apenas etapa e conserva responsável, próxima ação e revisão',()=>{
 const c={telefone,nome:'Teste',ultimaMensagem:'Hoje',revisao:90,classificado:true,estado:{...ESTADO_KANBAN_INICIAL,responsavelId:3,responsavelNome:'Equipe',proximaAcao:'Confirmar modelo'}};
 expect(movimentoKanban(c,'aguardando_fornecedor')).toEqual({telefone,etapa:'aguardando_fornecedor',responsavelId:3,proximaAcao:'Confirmar modelo',revisao:90});
 expect(movimentoKanban(c,'novas')).toBeNull();expect(movimentoKanban(c,'inexistente')).toBeNull();
});
