# Modo discreto: um olho que oculta valores e dados sensíveis

Data: 2026-09-24. Pedido do André: "um botão com a opção de ocultar custo, valor de venda e margem
e informações sensíveis como o Inter Bank faz".

Decisões dele, respondidas antes do desenho:

- **alcance:** global, em todas as telas;
- **o que oculta:** custo/lucro/margem, valores e totais, dados do cliente e também gráficos;
- **memória:** lembra por dispositivo (como o Inter) — ligou no celular, continua ligado ali; o
  desktop guarda a sua própria escolha.

Artboards aprovados no canvas "Modo discreto BFX" (Início visível, Início oculto, celular,
histórico e a folha do botão com a regra).

## Comportamento atual × esperado

Hoje não existe nada do tipo: nenhum `Eye`/`EyeOff` no código, nenhum mascaramento de dinheiro
(o único é `mascararToken` do webhook do Asaas, que é segredo, não valor). Quem atende um cliente
no balcão ou abre o sistema no celular mostra custo, lucro, margem e CPF para quem estiver do lado.

Esperado: um botão de olho ao lado do tema. Ligado, todo valor sensível vira uma fileira de pontos
e os gráficos saem de foco, em qualquer tela, até o próximo clique — inclusive depois de fechar e
abrir o navegador naquele aparelho.

## Por que o CSS oculta, e não um contexto de React

O inventário de 24/09 encontrou **~150 pontos de dinheiro em 28 arquivos** (136 deles chamando
`formatBRL` de `src/lib/utils.ts`), mais ~11 percentuais sensíveis e ~10 pontos de dado pessoal. E
**todas as páginas de `(app)` são server components** — só 6 arquivos em `src/app` têm
`"use client"`, nenhum deles página autenticada. Um `createContext` no client não alcançaria a
maioria dos pontos, e passar a preferência por cookie faria toda tela virar dinâmica por causa de
uma preferência visual.

Então: a preferência mora no aparelho, liga um atributo no `<html>`, e o CSS desenha a máscara
sobre quem carrega a classe. Server e client são cobertos pelo mesmo mecanismo, e nada vai ao
servidor nem ao banco.

## As peças

1. `src/lib/modo-discreto.ts` — regras puras e testadas: `ATRIBUTO_DISCRETO`
   (`data-valores-ocultos`), `CHAVE_DISCRETO` (`bfx:valores-ocultos` no localStorage, prefixado
   para não colidir com o `theme` do next-themes), as classes, `lerPreferencia`,
   `valorParaGuardar`, `rotuloDoBotao`, `aplicarNoDocumento` e `scriptDeInicializacao`.
2. `src/components/valores-toggle.tsx` — o botão (client), espelhado no `ThemeToggle`: redondo,
   alvo de 44px no celular, `aria-pressed`, ícone de olho fechado e anel verde quando está
   ocultando, e o rótulo dizendo o que o clique faz ("Ocultar valores" / "Mostrar valores").
3. `src/app/layout.tsx` — script no `<head>` que aplica a escolha **antes da primeira pintura**.
   Sem ele, quem deixou os valores ocultos veria os números por um instante até o React montar —
   exatamente o que o modo existe para evitar. Tudo em try/catch: `localStorage` lança em janela
   anônima, e um erro ali roda antes do React e levaria a página inteira.
4. `src/app/(app)/layout.tsx` — onde os controles ficam. A primeira versão pôs o olho ao lado do
   sino e do tema, no cabeçalho da sidebar; o André olhou e disse que ali o botão "está disputando
   muita atenção e espaço". Arrumação pedida por ele:
   - a barra do topo do conteúdo, que só existia no celular (`lg:hidden`), passa a valer em
     **qualquer tamanho** e leva o **sino e o olho** à direita. No desktop só esse lado aparece —
     nome e perfil já estão na sidebar;
   - o **tema desce para o pé da sidebar**, ao lado do "Sair" (e, no celular, dentro do menu, que
     usa o mesmo componente);
   - o cabeçalho da sidebar fica só com a marca, o nome e o selo do perfil.
5. `src/app/globals.css` — a máscara:
   - `.valor-sensivel`: texto transparente e uma fileira de pontos (`radial-gradient` repetido) que
     preenche a caixa do elemento marcado — como a caixa não muda de tamanho, nenhuma coluna salta
     ao ligar e desligar (marcar o elemento mais interno é o que faz a fileira ter o tamanho do
     valor, ver "Regras" abaixo); `.valor-sensivel-fim` alinha os pontos à direita, para célula e
     total;
   - `.bloco-sensivel`: gráfico, medidor ou miniatura sai de foco em bloco, sem escala legível;
   - tudo dentro de `@media screen`: a máscara é só para a tela — impressão, PDF e planilha saem
     completos (os relatórios de verdade são gerados no servidor e nunca foram afetados).
     Restringir à tela em vez de desfazer num bloco de impressão é de propósito: desfazer
     devolvia `color: inherit` e apagava a cor semântica do valor no papel.

O primeiro render do botão é sempre "visível" para casar com o HTML do servidor na hidratação; o
ícone se acerta no `useEffect`. O valor em si nunca aparece nesse intervalo, porque o documento já
estava marcado pelo script do `<head>`.

## O que fica oculto e o que continua à vista

| Oculta | Continua visível |
|---|---|
| Custo, custo de envio, lucro, margem, taxa da Prudent, comissão | Nome do cliente, produto, vendedor |
| Valor de venda, de parcela, totais de cards e rodapés, faturamento, metas em R$ | Datas, vencimentos, quantidade de parcelas ("4x") |
| Limite, comprometido, disponível e renda do cliente | Quantidades e contagens (vendas, estoque, parcelas por balde) |
| CPF/CNPJ, telefone, endereço, matrícula | Selos de situação (Antecipada, A antecipar, Vencida, Paga) |
| Gráficos do dashboard, do financeiro e das comissões | Campos que o usuário está digitando, com seus rótulos |

O campo em preenchimento fica de fora de propósito: quem está lançando a venda precisa ler o que
digita. Pelo mesmo motivo, rótulo como "Custo (R$)" continua legível — o rótulo não é o valor.

Três exceções que a revisão de 24/09 obrigou a nomear, todas do mesmo tipo — máscara que atrapalha
o trabalho em vez de proteger:

- **aviso de divergência das parcelas** ("a soma das parcelas difere do total da venda"): fica
  visível. Ele existe para o operador ACERTAR os valores que está digitando; mascarado, diz que
  divergiu e não diz por quanto;
- **matrícula no aviso de matrícula repetida** da planilha da folha: fica visível. Ali ela
  identifica a linha duplicada da planilha, e é o dado que o operador precisa para corrigir antes
  de mandar ao RH. Matrícula em lista de cliente continua mascarada;
- **taxa de comissão em %** (`gestao-rh`, `comissoes`, `perfil`): fica visível. É cláusula de
  contrato, não valor recebido — o que oculta é a meta em R$ e o valor da comissão ao lado.

## Regras para quem marcar um ponto novo

- Marque o **elemento mais interno** que contenha só o valor. A fileira de pontos preenche a caixa
  do elemento marcado, não a largura do texto: num `div`/`CardContent` de largura total ela iria de
  borda a borda, então nesses casos o valor vai num `<span>`.
- Gráfico leva `bloco-sensivel` no contêiner do gráfico (o `CardContent`, o `ResponsiveContainer`),
  **não** na raiz do componente — na raiz o blur come título, legenda e estado vazio, e o
  `pointer-events: none` mataria controles.
- Valor que sai em **toast** precisa de JSX com a máscara: o toast é renderizado num portal, fora
  da árvore marcada.
- Medidor e barra de proporção contam como gráfico (`bloco-sensivel`): a barra desenha o que o
  número ao lado esconde.
- Rodar `npx vitest run src/__tests__/modo-discreto.test.ts` confere que as classes usadas nas
  telas são as que o CSS define (inclusive erro de digitação com acento).

## Limites conhecidos

- **A máscara é visual.** O valor continua no DOM (copiável, lido por leitor de tela) e o seletor de
  meses da antecipação ainda descreve o valor no `aria-label`. O modo existe contra leitura por cima
  do ombro, não contra quem tem acesso à máquina.
- **A faixa vaza, o número não.** Selo de margem (verde/amarelo/vermelho), seta de tendência e a cor
  da barra de consignado continuam indicando o balde. Esconder isso apagaria o alerta que faz a tela
  ser útil.
- **Script inline no `<head>`.** Hoje o projeto não tem CSP em lugar nenhum (`next.config.ts`,
  `nginx/`, `k8s/`, `deploy/`, `vercel.json`). Se um dia entrar, este script e o do next-themes
  param juntos e em silêncio — o modo passaria a mostrar os valores por um instante ao carregar.

## Fora do escopo

- Catálogo público e o preview de recibo (dados fictícios), que estão fora da casca autenticada.
- Ocultar valores dentro das tabelas que a IA gera no chat do BFX Intelligence: o texto vem do
  modelo em markdown, sem elemento para marcar. Fica anotado como ponto cego.
- Atalho de teclado e ocultar por tela: não pedidos.
- Qualquer mudança de dado, de API ou de relatório gerado no servidor.
