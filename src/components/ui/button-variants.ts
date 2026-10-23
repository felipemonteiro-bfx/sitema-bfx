import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  // O padrao de tamanho de icone da base era incondicional e sobrescrevia TODA
  // classe de tamanho posta no proprio icone: a variante arbitraria de <svg>
  // vira o seletor `.btn svg`,
  // especificidade (0,1,1), e `h-3.5 w-3.5` no <svg> tem (0,1,0) — perde. O
  // tailwind-merge nao enxerga o conflito porque as classes estao em elementos
  // diferentes. Medido em producao (82dcc8b): chevrons declarados `h-3.5 w-3.5`
  // renderizando 16.0x16.0 e o sol/lua do ThemeToggle declarado `h-[1.2rem]`
  // idem. As guardas `:not()` devolvem a palavra final a quem declarou o
  // tamanho — e o padrao do shadcn/ui atual, com `h-` a mais porque o BFX
  // declara icone com `h-N w-N`, nao com `size-N`.
  //
  // As guardas casam so em BORDA DE PALAVRA (` h-` ou inicio do atributo), e
  // isso nao e preciosismo: uma guarda de substring pura em h- casaria com o
  // NOME do proprio icone. O lucide emite `class="lucide lucide-trash-2"`, e ali dentro ha a
  // substring `h-2`; `lucide-refresh-cw` traz `h-c`. Um `<Trash2 />` sem classe
  // de tamanho pararia de herdar o padrao e cairia nos atributos intrinsecos
  // (`width="24"`), renderizando 24px dentro de um botao. Hoje todos os 16
  // `<Trash2>` do repo declaram `h-N w-N` e nada quebraria — mas o proximo
  // call site quebraria em silencio.
  // `shrink-0` e `pointer-events-none` continuam incondicionais: nao sao
  // tamanho, e e justamente a falta do `shrink-0` que achata icone em flex
  // apertado (medido: `h-3 w-3` renderizando 8.42px onde nao ha buttonVariants).
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-controle text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-']):not([class*='_h-']):not([class^='h-'])]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      // Vantage: botao plano, sem sombra (a hierarquia vem de cor e peso, nao de
      // elevacao). Primario em verde com hover opaco `primary-hover`; outline
      // sobre o trilho `controle` com a borda de campo `input`.
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]",
        gradient:
          // `text-gradient-cta-foreground` e nao `text-white`: e o mesmo gradiente da
          // marca que o logo da sidebar usa, e agora tem par policiado (5.05:1 no
          // extremo claro, 8.65:1 no escuro). Cor crua assim nao era pega por
          // `raw-color-scan`: o padrao dele exige familia + escala numerica, e
          // `white` nao tem escala — passava batido pelas duas catracas.
          "bg-gradient-to-r from-gradient-cta-from to-gradient-cta-to text-gradient-cta-foreground active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        success:
          "bg-success text-success-foreground hover:bg-success/90 active:scale-[0.98]",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 active:scale-[0.98]",
        error:
          "bg-error text-error-foreground hover:bg-error/90 active:scale-[0.98]",
        info:
          "bg-info text-info-foreground hover:bg-info/90 active:scale-[0.98]",
        outline:
          "border border-input bg-controle text-foreground hover:bg-controle-ativo hover:text-foreground hover:border-accent/60 hover:[&_svg]:text-foreground aria-expanded:bg-controle-ativo aria-expanded:border-accent/60 data-[state=open]:bg-controle-ativo active:scale-[0.98] transition-all",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        // Ação de marca em tint (atalhos do atendimento): borda e texto `marca-tint-texto`
        // (5.60:1 sobre o tint), preenchimento OPACO. Nunca preenchido de verde cheio.
        tint:
          "border border-marca-tint-texto/30 bg-marca-tint text-marca-tint-texto hover:brightness-95",
        // `ghost`: hover e estado aberto no cinza de controle (Vantage). Nunca no accent verde: os icones
        // destes botoes sao `text-muted-foreground` e ficariam cinza sobre verde (~1,5:1). No hover o
        // icone acompanha o texto em `foreground`.
        ghost: "hover:bg-controle hover:text-foreground hover:[&_svg]:text-foreground aria-expanded:bg-controle aria-expanded:text-foreground aria-expanded:[&_svg]:text-foreground data-[state=open]:bg-controle data-[state=open]:text-foreground active:scale-[0.98]",
        // --- Variantes que as telas repetiam por `className` (o lint barra cor no
        // chamador, design-system/lint-policy.mjs). Nome pelo PAPEL, nao pela cor.
        // `discreto`: acao secundaria em texto muted que acende no hover.
        discreto: "text-muted-foreground hover:bg-controle hover:text-foreground active:scale-[0.98]",
        // `discretoPlano`: igual, sem fundo no hover (ex.: "x" de limpar dentro do campo).
        discretoPlano: "text-muted-foreground hover:bg-transparent hover:text-foreground",
        // `discretoErro`: muted que vira vermelho no hover (excluir, remover).
        discretoErro: "text-muted-foreground hover:bg-controle hover:text-error-text active:scale-[0.98]",
        // `sutilErro`: acao destrutiva sem preenchimento (texto de erro, fundo so no hover).
        sutilErro: "text-error-text hover:bg-controle hover:text-error-text active:scale-[0.98]",
        // `outlineErro`: contorno neutro com texto de erro; no hover vira tint de erro.
        outlineErro:
          "border border-divisoria bg-transparent text-error-text transition-colors hover:border-error hover:bg-error-bg hover:text-error-text",
        // `tintAviso`: pilula de aviso (ex.: link de assinatura pendente).
        tintAviso:
          "border border-warning bg-warning-bg text-warning-text hover:bg-warning-bg/70 hover:text-warning-text",
        // `controle`: botao de icone sobre o trilho `controle` (tema, menu, sino, olho).
        controle:
          "border border-divisoria bg-controle text-texto-secundario hover:bg-controle-ativo hover:text-foreground active:scale-[0.98]",
        // `controleAtivo`: o mesmo botao ligado (ex.: modo discreto ativo).
        controleAtivo:
          "border border-primary bg-success-bg text-success-text hover:bg-success-bg hover:text-success-text active:scale-[0.98]",
        // `campo`: botao que parece campo (gatilho de seletor/busca): fundo `controle`,
        // borda de campo, texto muted ate ter valor.
        campo:
          "h-9 justify-start bg-controle px-3 font-normal text-muted-foreground hover:bg-controle-ativo hover:text-foreground active:scale-100",
        // `seletor`: gatilho de seletor (combobox) com a mesma pele do Select da ui.
        // `data-vazio=true` acende o tom muted do placeholder.
        seletor:
          "flex h-11 w-full items-center justify-between whitespace-nowrap rounded-controle border border-input bg-controle px-3 py-2 text-sm font-normal text-foreground ring-offset-background hover:border-input hover:bg-controle hover:text-foreground active:scale-100 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[vazio=true]:text-muted-foreground data-[erro=true]:border-error data-[tamanho=compacto]:h-9 data-[tamanho=compacto]:rounded-md data-[tamanho=compacto]:px-2 data-[tamanho=compacto]:text-xs data-[tamanho=pilula]:h-10 data-[tamanho=pilula]:rounded-full data-[tamanho=pilula]:border-divisoria data-[tamanho=pilula]:bg-poco data-[tamanho=pilula]:text-xs",
        // `faixa`: miolo de um intervalo selecionado (tint da marca).
        faixa: "bg-primary/10 text-foreground hover:bg-primary/15 hover:text-foreground",
        // `linha`: linha de lista clicavel (resultado de busca, item de menu): largura
        // total, texto a esquerda, sem raio e sem escala no clique.
        linha:
          "h-auto w-full justify-start whitespace-normal rounded-none px-3 py-2 text-left font-normal hover:bg-controle hover:text-foreground active:scale-100",
        // `linhaAcao`: ultima linha da lista com a acao (ex.: "Cadastrar ...").
        linhaAcao:
          "h-auto w-full justify-start whitespace-normal rounded-none border-t border-border px-3 py-2 text-left font-medium text-primary hover:bg-controle hover:text-primary active:scale-100",
        // `linhaDivisoria`: linha de lista com filete embaixo (some na ultima).
        linhaDivisoria:
          "h-auto w-full flex-col items-stretch justify-start whitespace-normal rounded-none border-b border-border px-3 py-2.5 text-left font-normal last:border-b-0 hover:bg-controle hover:text-foreground active:scale-100",
        // `linhaCompacta`: opcao de sugestao em popover (texto pequeno, raio medio).
        linhaCompacta:
          "h-auto w-full justify-start whitespace-normal rounded-md px-2 py-1.5 text-left text-xs font-normal hover:bg-controle hover:text-foreground active:scale-100",
        // `bloco`: o botao e um bloco de conteudo (item de notificacao, quadro de assinatura).
        bloco:
          "h-auto w-full flex-col justify-start whitespace-normal rounded-none p-0 text-left font-normal hover:bg-transparent active:scale-100",
        // `cartao`: o botao e o cartao inteiro do quadro kanban (conteudo empilhado, a
        // esquerda, quebra de linha liberada). O article em volta e quem arrasta.
        cartao:
          "w-full flex-col items-stretch justify-start gap-1.5 whitespace-normal rounded-md border border-divisoria bg-card-elevated text-left font-normal text-foreground shadow-sm hover:bg-secondary hover:text-foreground active:scale-100 data-[ativo=true]:ring-2 data-[ativo=true]:ring-inset data-[ativo=true]:ring-primary dark:border-transparent",
        // `revelar`: acao discreta que so aparece no hover/foco do bloco pai (`group`), como a
        // setinha de menu das bolhas do WhatsApp (grupo `msg`); continua visivel com o menu aberto e some no toque,
        // onde vale segurar o dedo (o botao segue no layout, e a ancora do menu, mas nao recebe toque).
        revelar:
          "rounded-full bg-secondary text-secondary-foreground opacity-0 shadow-sm transition-opacity hover:bg-secondary/80 group-hover:opacity-100 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 focus-visible:opacity-100 pointer-coarse:pointer-events-none pointer-coarse:opacity-0 pointer-coarse:data-[state=open]:opacity-0 data-[state=open]:opacity-100 motion-reduce:transition-none",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      // Alvo de toque de 44px (WCAG 2.5.5 / UX-02). `default`, `lg` e `icon`
      // ja nascem com 44px. `sm` e `iconSm` mantem a DENSIDADE visual (36/32px,
      // usada em linha de tabela e barra de filtros), mas a area clicavel chega
      // a 44px por um pseudo-elemento invisivel centrado no botao (`after:`):
      // nenhum layout muda e o dedo nao erra o alvo. O `relative` ancora o `after`.
      size: {
        default: "h-11 px-4 py-2",
        sm: "relative h-9 px-3 text-xs after:absolute after:left-1/2 after:top-1/2 after:min-h-11 after:min-w-full after:-translate-x-1/2 after:-translate-y-1/2",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
        // Compactos: acao de linha densa (xs), icone pequeno em campo (iconXs/iconMini),
        // botao com cara de texto (inline/inlineXs) e o chamado de acao grande (cta).
        xs: "relative h-7 px-2 text-xs after:absolute after:left-1/2 after:top-1/2 after:min-h-11 after:min-w-full after:-translate-x-1/2 after:-translate-y-1/2",
        iconXs: "h-7 w-7",
        iconMini: "h-6 w-6",
        // `cartao`: altura livre e respiro de cartao (par da variante `cartao`).
        cartao: "h-auto px-2.5 pb-2 pt-2.5",
        inline: "h-auto p-0",
        inlineXs: "h-auto p-0 text-xs",
        // Celula de mes do seletor de intervalo; `data-hoje=true` marca o mes atual.
        mes: "h-14 flex-col gap-0 rounded-md px-1 font-semibold data-[hoje=true]:ring-1 data-[hoje=true]:ring-inset data-[hoje=true]:ring-primary/50",
        cta: "h-12 px-12 text-base font-semibold",
        // Acao em linha de tabela. Existe para substituir o `h-8 px-2` que os
        // call sites de /cadastros empilhavam sobre a size `default`: aquele
        // `px-2` nao apagava o `py-2` da default, entao o content-box ficava em
        // exatamente 16x16 para um icone de 16x16 — folga zero nos quatro
        // lados, em 15 botoes. Sem padding, como a `icon`: 32x32 com o icone
        // centrado e 8px de folga por lado. Area de toque de 44px via `after:`.
        iconSm: "relative h-8 w-8 after:absolute after:left-1/2 after:top-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2",
      },
      // Forma: so a pilula (botao redondo de icone), o resto herda `rounded-controle`.
      forma: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      forma: "default",
    },
  }
)
