const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function termosDeProduto(texto:string):string[]{
 const t=normalizar(texto);
 if(/\b(paguei|pagamento|parcela|comprovante|boleto|garantia|entrega|pedido|atendente|humano|sair|parar)\b/.test(t)||/^(oi|ola|bom dia|boa tarde|boa noite|menu|ajuda|voltar)[!.?\s]*$/.test(t))return [];
 const stop=new Set('voce voces tem tems possuem teria temos eu quero queria gostaria saber de do da dos das um uma uns umas o a os as e em no na para por favor bom dia boa tarde noite preco valor quanto custa estoque disponivel disponiveis comprar produto produtos orcamento me mostrar ver com sem'.split(' '));
 return [...new Set(t.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x&&!stop.has(x)&&(x.length>2||/^\d+$/.test(x))))].slice(0,6);
}
/** Catálogo orienta venda sob demanda; saldo local não limita o atendimento. */
export function respostaEstoque(produtos:{nome:string;qtdEstoque:number|null}[]):string{
 if(!produtos.length)return 'Não localizei esse modelo no catálogo do Manager, mas a BFX também atende sob encomenda. Pode informar marca, modelo e quantidade? Vamos consultar o fornecedor e confirmar preço e prazo antes de fechar. Para falar com a equipe, escreva ATENDENTE.';
 return 'A BFX também atende sob encomenda. Localizei estes modelos no nosso catálogo:\n'+produtos.slice(0,5).map(p=>'• '+p.nome).join('\n')+'\nQual modelo e quantidade você procura? Vamos consultar o fornecedor e confirmar preço, disponibilidade e prazo de entrega antes de fechar. Para atendimento humano, escreva ATENDENTE.';
}
