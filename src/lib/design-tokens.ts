/**
 * Design Tokens - Sistema BFX
 *
 * Constantes semânticas para uso consistente em toda aplicação.
 * Baseado no design system gerado para dashboard financeiro/administrativo.
 */

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  /** Gap padrão entre campos de formulário (1rem / 16px) */
  formGap: 'space-y-4',

  /** Gap entre seções de conteúdo (1.5rem / 24px) */
  sectionGap: 'space-y-6',

  /** Padding interno de cards (1.5rem / 24px) */
  cardPadding: 'p-6',

  /** Altura padrão de inputs (2.5rem / 40px) */
  inputHeight: 'h-10',

  /** Gap horizontal em formulários inline */
  formGapX: 'space-x-4',

  /** Gap para grid layouts */
  gridGap: 'gap-6',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  /** Título de card/seção */
  cardTitle: 'text-lg font-semibold leading-none tracking-tight',

  /** Título de página/módulo */
  pageTitle: 'text-2xl font-bold tracking-tight',

  /** Título de seção grande */
  sectionTitle: 'text-xl font-bold',

  /** Subtítulo/descrição */
  subtitle: 'text-sm text-muted-foreground',

  /** Label de formulário - estilo padronizado */
  label: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',

  /** Texto corpo padrão */
  body: 'text-sm',

  /** Texto corpo pequeno */
  bodySmall: 'text-xs',

  /** Texto de ajuda/hint */
  hint: 'text-xs text-muted-foreground',

  /** Texto mono para códigos/números */
  mono: 'font-mono text-sm',

  /** Destaque de valores monetários */
  currency: 'text-lg font-bold tabular-nums',
} as const;

// ============================================================================
// COLORS - Variants semânticos
// ============================================================================

export const colors = {
  /** Botão primário - ações principais */
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',

  /** Botão secundário - ações alternativas */
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',

  /** Botão de sucesso - confirmar, salvar, lucro */
  success: 'bg-success text-success-foreground hover:bg-success/90',

  /** Botão de aviso - atenção, pendente */
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',

  /** Botão de erro - deletar, cancelar, custo */
  error: 'bg-error text-error-foreground hover:bg-error/90',

  /** Botão de informação */
  info: 'bg-info text-info-foreground hover:bg-info/90',

  /** Botão destrutivo (alias para error) */
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',

  /** Botão outline */
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',

  /** Botão ghost */
  ghost: 'hover:bg-accent hover:text-accent-foreground',

  /** Link */
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

// ============================================================================
// TEXT COLORS - Para badges, indicadores, etc
// ============================================================================

export const textColors = {
  /** Texto de sucesso - valores positivos, lucro */
  success: 'text-success',

  /** Texto de aviso */
  warning: 'text-warning',

  /** Texto de erro - valores negativos, custo */
  error: 'text-error',

  /** Texto de informação */
  info: 'text-info',

  /** Texto padrão */
  default: 'text-foreground',

  /** Texto secundário/muted */
  muted: 'text-muted-foreground',

  /** Texto primário (enfatizado) */
  primary: 'text-primary',
} as const;

// ============================================================================
// BACKGROUND COLORS
// ============================================================================

export const backgrounds = {
  /** Background de sucesso (badges, alertas) */
  success: 'bg-success/10 text-success',

  /** Background de aviso */
  warning: 'bg-warning/10 text-warning',

  /** Background de erro */
  error: 'bg-error/10 text-error',

  /** Background de informação */
  info: 'bg-info/10 text-info',

  /** Background muted (seções secundárias) */
  muted: 'bg-muted',

  /** Background de card */
  card: 'bg-card',

  /** Background de popover/modal */
  popover: 'bg-popover',
} as const;

// ============================================================================
// BORDERS
// ============================================================================

export const borders = {
  /** Border padrão */
  default: 'border border-border',

  /** Border de sucesso */
  success: 'border border-success',

  /** Border de aviso */
  warning: 'border border-warning',

  /** Border de erro */
  error: 'border border-error',

  /** Border de informação */
  info: 'border border-info',

  /** Border de input */
  input: 'border border-input',
} as const;

// ============================================================================
// EFFECTS - Sombras, transições, etc
// ============================================================================

export const effects = {
  /** Sombra padrão de card */
  cardShadow: 'shadow-sm',

  /** Sombra elevada (modal, popover) */
  elevatedShadow: 'shadow-lg',

  /** Transição suave de cores */
  transition: 'transition-colors duration-200',

  /** Transição de todos propriedades */
  transitionAll: 'transition-all duration-200',

  /** Focus ring padrão */
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',

  /** Backdrop blur para cards glassmorphism */
  backdropBlur: 'backdrop-blur-sm',

  /** Hover scale sutil */
  hoverScale: 'hover:scale-[1.02] transition-transform duration-200',
} as const;

// ============================================================================
// LAYOUTS - Padrões de estrutura
// ============================================================================

export const layouts = {
  /** Container padrão de formulário */
  formContainer: 'space-y-4 max-w-2xl',

  /** Container de seção */
  sectionContainer: 'space-y-6',

  /** Grid de cards 2 colunas */
  cardGrid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',

  /** Grid de cards 3 colunas */
  cardGrid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',

  /** Grid de cards 4 colunas */
  cardGrid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',

  /** Flexbox centralizado */
  flexCenter: 'flex items-center justify-center',

  /** Flexbox espaçado */
  flexBetween: 'flex items-center justify-between',

  /** Stack vertical */
  stack: 'flex flex-col',
} as const;

// ============================================================================
// BUTTONS - Variantes completas
// ============================================================================

export const buttons = {
  /** Botão primário (default) */
  primary: `${colors.primary} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,

  /** Botão de sucesso */
  success: `${colors.success} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,

  /** Botão de aviso */
  warning: `${colors.warning} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,

  /** Botão destrutivo */
  destructive: `${colors.destructive} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,

  /** Botão outline */
  outline: `${colors.outline} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,

  /** Botão ghost */
  ghost: `${colors.ghost} ${effects.transition} ${effects.focusRing} inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50`,
} as const;

// ============================================================================
// CARDS
// ============================================================================

export const cards = {
  /** Card padrão */
  default: `${backgrounds.card} ${borders.default} ${effects.cardShadow} rounded-2xl p-6`,

  /** Card com backdrop blur (glassmorphism) */
  glass: `${backgrounds.card} ${borders.default} ${effects.cardShadow} ${effects.backdropBlur} rounded-2xl p-6`,

  /** Card interativo (clicável) */
  interactive: `${backgrounds.card} ${borders.default} ${effects.cardShadow} rounded-2xl p-6 cursor-pointer hover:bg-accent/50 ${effects.transition}`,
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Combina classes CSS de forma segura
 * @param classes - Lista de classes para combinar
 * @returns String com classes combinadas
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Retorna classe de cor baseada em valor (positivo/negativo)
 * @param value - Valor numérico
 * @returns Classe de texto (success para positivo, error para negativo)
 */
export function getValueColor(value: number): string {
  if (value > 0) return textColors.success;
  if (value < 0) return textColors.error;
  return textColors.default;
}

/**
 * Retorna classe de background baseada em status
 * @param status - Status do item (pendente, aprovado, rejeitado, etc)
 * @returns Classe de background
 */
export function getStatusBackground(status: string): string {
  const statusMap: Record<string, string> = {
    pendente: backgrounds.warning,
    aprovado: backgrounds.success,
    rejeitado: backgrounds.error,
    cancelado: backgrounds.error,
    ativo: backgrounds.success,
    inativo: backgrounds.muted,
    pago: backgrounds.success,
    'em-aberto': backgrounds.warning,
    vencido: backgrounds.error,
  };

  return statusMap[status.toLowerCase()] || backgrounds.info;
}
