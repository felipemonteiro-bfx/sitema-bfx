import { expect, it } from 'vitest';
import { termosDeProduto, respostaEstoque } from '@/lib/whatsapp-estoque';
it('entende ventilador sem exigir a palavra estoque',()=>{expect(termosDeProduto('Vocês tem ventilador?')).toEqual(['ventilador']);});
it('não transforma saudações e pagamento em busca de produto',()=>{expect(termosDeProduto('bom dia')).toEqual([]);expect(termosDeProduto('paguei minha parcela')).toEqual([]);});
it('informa apenas saldo positivo e nunca custo ou preço sem condição comercial',()=>{const texto=respostaEstoque([{nome:'Ventilador coluna 40cm',qtdEstoque:2},{nome:'Ventilador mesa',qtdEstoque:0}]);expect(texto).toContain('Ventilador coluna 40cm');expect(texto).not.toContain('Ventilador mesa');expect(texto).not.toContain('R$');expect(texto).toContain('registrado');});
it('ausência no cadastro não é afirmação definitiva de indisponibilidade',()=>{expect(respostaEstoque([])).toContain('não localizei');expect(respostaEstoque([])).not.toContain('não temos');});

it('distingue cadastro sem saldo de produto ausente',()=>{const s=respostaEstoque([{nome:'Ventilador Arno',qtdEstoque:0}]);expect(s).toContain('Ventilador Arno');expect(s).toContain('não mostra saldo positivo');});
