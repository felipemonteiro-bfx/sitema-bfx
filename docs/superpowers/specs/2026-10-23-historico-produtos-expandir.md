# Produtos em linha de detalhe no Histórico

Modo: Operate. Refinamento do Vantage, sem alteração de dados ou ações.

Hoje a expansão ocupa a célula de produto e aumenta a altura da linha principal. Ao expandir uma venda com múltiplos produtos, mostrar uma linha adicional imediatamente abaixo, abrangendo as dez colunas. Exibir nomes completos, quantidades e subtotais, preservando o modo discreto dos valores. A largura útil dos detalhes acompanha a região visível da tabela, inclusive durante a rolagem horizontal.

O botão informa o estado com `aria-expanded` e identifica a linha controlada. Enter e Espaço abrem/fecham; cada venda tem estado independente. Vendas com um produto e cards mobile mantêm o comportamento existente.

Refinamento: qualquer área não interativa da linha principal também alterna os detalhes. Botões, links, campos e conteúdo de popovers executam apenas sua ação original; selecionar texto não deve expandir/recolher. O botão de produtos continua sendo o acesso por teclado, sem alternância duplicada por propagação do clique.

Verificar a linha separada, estabilidade da linha principal, dados dos itens, teclado, duas expansões independentes, scroll e temas claro/escuro em desktop e tablet. Prévia com banco somente de leitura.
