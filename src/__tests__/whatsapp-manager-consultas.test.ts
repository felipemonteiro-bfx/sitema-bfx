import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({scope:vi.fn(),sales:vi.fn()}));
vi.mock('@/lib/mcp-agente',()=>({resolverEscopo:m.scope}));
vi.mock('@/lib/db',()=>({prisma:{venda:{findMany:m.sales}}}));
import {consultarRespostaManager} from '@/lib/whatsapp-manager-consultas';
beforeEach(()=>{vi.resetAllMocks();m.scope.mockResolvedValue({ok:true,escopo:{clienteId:42,nome:'Cliente Teste'}});m.sales.mockResolvedValue([]);});
it('usa apenas identidade do telefone e não um cliente citado na mensagem',async()=>{
 await consultarRespostaManager('5511999990000','quero minhas compras do cliente 999');
 expect(m.scope).toHaveBeenCalledWith('5511999990000');
 expect(m.sales.mock.calls[0][0].where).toMatchObject({clienteId:42,status:{notIn:['cancelada','estornada']}});
});
it('não consulta compras quando identidade é ambígua ou ausente',async()=>{
 m.scope.mockResolvedValue({ok:false,erro:'identificacao_ambigua'});
 expect(await consultarRespostaManager('5511999990000','minhas parcelas')).toContain('cadastro com segurança');
 expect(m.sales).not.toHaveBeenCalled();
});
it('não confirma quitação por baixa manual ou antecipação Prudent futura',async()=>{
 m.sales.mockResolvedValue([{id:7,dataVenda:new Date('2026-10-14T12:00:00Z'),produtoNome:'Ventilador',itens:[],parcelasVencimento:[{numeroParcela:1,valorParcela:100,dataVencimento:new Date('2099-11-01T12:00:00Z'),paga:true,origemPagamento:'prudent',liquidadaEm:null},{numeroParcela:2,valorParcela:100,dataVencimento:new Date('2026-09-01T12:00:00Z'),paga:true,origemPagamento:'manual',liquidadaEm:null}]}]);
 const r=await consultarRespostaManager('5511999990000','meus pagamentos');
 expect(r).toContain('a vencer');expect(r).toContain('Baixa registrada (manual)');expect(r).toContain('não confirma');
 expect(r).not.toContain('quitado');
});
it('falha fechada e não chama serviço financeiro para pergunta de produto',async()=>{
 expect(await consultarRespostaManager('5511999990000','tem ventilador')).toBeNull();expect(m.scope).not.toHaveBeenCalled();
 m.scope.mockRejectedValue(new Error('private-db-secret'));
 const r=await consultarRespostaManager('5511999990000','meu pedido');expect(r).toContain('consultar');expect(r).not.toContain('secret');
});
it('não interpreta comprovante enviado como pagamento conciliado',async()=>{
 const r=await consultarRespostaManager('5511999990000','paguei a parcela, enviei comprovante');
 expect(r).toContain('não confirma');expect(r).toContain('comprovante');
});
it('saldo de estoque segue para catálogo, não histórico financeiro',async()=>{
 expect(await consultarRespostaManager('5511999990000','qual saldo de estoque do ventilador?')).toBeNull();expect(m.scope).not.toHaveBeenCalled();
});
it('Prudent futura liquidada não remove aviso do desconto a vencer',async()=>{
 m.sales.mockResolvedValue([{id:7,dataVenda:new Date(),produtoNome:'Produto',itens:[],parcelasVencimento:[{numeroParcela:1,valorParcela:100,dataVencimento:new Date('2099-11-01T12:00:00Z'),paga:true,origemPagamento:'prudent',liquidadaEm:new Date()}]}]);
 expect(await consultarRespostaManager('5511999990000','minhas parcelas')).toContain('a vencer');
});
