# Rolagem do atendimento

A altura da lista/chat usa compensações fixas de padding e margens negativas. O cabeçalho varia com largura, navegação e moldura do shell, fazendo a página e a conversa rolarem simultaneamente e deixando o composer fora da área visível.

A área de lista deve ocupar exatamente o espaço entre sua posição real e o rodapé da moldura, medido no navegador; recalcular quando viewport/cabeçalho mudarem. Remover compensações fixas e altura mínima que ultrapassa telas curtas. Lista, mensagens e ficha mantêm rolagem independente, com overscroll contido. Cabeçalho e composer continuam visíveis. Preserve a rota de janela, o visual Vantage, seleção e comportamento de atualização do histórico.

Verificar desktop 1440x900, tablet 1024x768, celulares 390x844 e 390x560, temas claro/escuro, lista/chat e ficha. Regressão deve provar página sem overflow vertical e composer dentro da viewport; scroll interno não movimenta a página.
