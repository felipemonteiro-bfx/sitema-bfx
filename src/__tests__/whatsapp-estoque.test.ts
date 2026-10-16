import { expect, it } from 'vitest';
import { termosDeProduto, respostaEstoque } from '@/lib/whatsapp-estoque';
it('entende ventilador sem exigir a palavra estoque',()=>{expect(termosDeProduto('Vocês tem ventilador?')).toEqual(['ventilador']);});
it('não transforma saudações e pagamento em busca de produto',()=>{expect(termosDeProduto('bom dia')).toEqual([]);expect(termosDeProduto('paguei minha parcela')).toEqual([]);});
it('oferece catálogo sob encomenda mesmo com saldo zero, sem prometer preço ou prazo',()=>{const s=respostaEstoque([{nome:'Ventilador Arno',qtdEstoque:0}]);expect(s).toContain('Ventilador Arno');expect(s).toContain('sob encomenda');expect(s).not.toContain('saldo');expect(s).not.toContain('R$');expect(s).toContain('confirmar preço');});
it('não encontrar no catálogo não impede consultar fornecedor',()=>{const s=respostaEstoque([]);expect(s).toContain('sob encomenda');expect(s).toContain('fornecedor');expect(s).not.toContain('não temos');});
