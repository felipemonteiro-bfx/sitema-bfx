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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-']):not([class*=' h-']):not([class^='h-'])]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        gradient:
          // `text-gradient-cta-foreground` e nao `text-white`: e o mesmo gradiente da
        // marca que o logo da sidebar usa, e agora tem par policiado (3.69:1 no
        // extremo rose, 5.80:1 no violet). Cor crua assim nao era pega por
        // `raw-color-scan`: o padrao dele exige familia + escala numerica, e
        // `white` nao tem escala — passava batido pelas duas catracas.
        "bg-gradient-to-r from-gradient-cta-from to-gradient-cta-to text-gradient-cta-foreground shadow-md hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        success:
          "bg-success text-success-foreground shadow-md hover:bg-success/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--glow-primary)] dark:hover:shadow-[var(--glow-accent)]",
        warning:
          "bg-warning text-warning-foreground shadow-md hover:bg-warning/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        error:
          "bg-error text-error-foreground shadow-md hover:bg-error/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        info:
          "bg-info text-info-foreground shadow-md hover:bg-info/90 hover:shadow-lg active:scale-[0.98] dark:shadow-[var(--shadow-sm)] dark:hover:shadow-[var(--shadow-md)]",
        outline:
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent active:scale-[0.98] transition-all",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        // Acao em linha de tabela. Existe para substituir o `h-8 px-2` que os
        // call sites de /cadastros empilhavam sobre a size `default`: aquele
        // `px-2` nao apagava o `py-2` da default, entao o content-box ficava em
        // exatamente 16x16 para um icone de 16x16 — folga zero nos quatro
        // lados, em 15 botoes. Sem padding, como a `icon`: 32x32 com o icone
        // centrado e 8px de folga por lado.
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)