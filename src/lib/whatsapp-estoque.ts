const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function termosDeProduto(texto:string):string[]{
 const t=normalizar(texto);
 if(/\b(paguei|pagamento|parcela|comprovante|boleto|garantia|entrega|pedido|atendente|humano|sair|parar)\b/.test(t)||/^(oi|ola|bom dia|boa tarde|boa noite|menu|ajuda|voltar)[!.?\s]*$/.test(t))return [];
 const stop=new Set('voce voces tem tems possuem teria temos eu quero queria gostaria saber de do da dos das um uma uns umas o a os as e em no na para por favor bom dia boa tarde noite preco valor quanto custa estoque disponivel disponiveis comprar produto produtos orcamento me mostrar ver com sem'.split(' '));
 return [...new Set(t.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x&&!stop.has(x)&&(x.length>2||/^\d+$/.test(x))))].slice(0,6);
}
export function respostaEstoque(produtos:{nome:string;qtdEstoque:number|null}[]):string{
 const disponiveis=produtos.filter(p=>(p.qtdEstoque||0)>0).slice(0,5);
 if(!disponiveis.length&&produtos.length)return 'Localizei estes modelos no cadastro da BFX:\n'+produtos.slice(0,3).map(p=>'• '+p.nome).join('\n')+'\nO cadastro não mostra saldo positivo para esses modelos. A equipe precisa confirmar disponibilidade ou reposição antes de oferecer. Qual modelo você procura? Escreva ATENDENTE para falar com a equipe.';
 if(!disponiveis.length)return 'Consultei o estoque registrado no Manager e não localizei um produto disponível para essa descrição. Pode informar o modelo ou a marca? A equipe pode conferir alternativas. Escreva ATENDENTE para falar com uma pessoa.';
 return 'Consultei o estoque registrado no Manager agora. Encontrei:\n'+disponiveis.map(p=>`• ${p.nome} — ${p.qtdEstoque} un. registradas`).join('\n')+'\nQual desses modelos você procura e qual quantidade? A equipe confirma a disponibilidade física e as condições antes de fechar a venda. Para atendimento humano, escreva ATENDENTE.';
}
