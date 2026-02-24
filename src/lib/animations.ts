/**
 * Animações e micro-interações para dark mode
 *
 * Inclui prefers-reduced-motion para acessibilidade
 */

export const animations = {
  // Fade in bottom (cards, modals)
  fadeInUp: "animate-in fade-in-0 slide-in-from-bottom-4 duration-300",

  // Fade in (subtle elements)
  fadeIn: "animate-in fade-in-0 duration-200",

  // Scale in (buttons, badges)
  scaleIn: "animate-in zoom-in-95 duration-150",

  // Slide from right (sidebars, drawers)
  slideInRight: "animate-in slide-in-from-right-full duration-300",

  // Slide from left
  slideInLeft: "animate-in slide-in-from-left-full duration-300",

  // Spin (loading)
  spin: "animate-spin duration-1000",

  // Pulse (loading states)
  pulse: "animate-pulse duration-2000",

  // Bounce (attention)
  bounce: "animate-bounce duration-1000",

  // Hover scale (interactive cards)
  hoverScale: "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",

  // Hover glow (buttons, links)
  hoverGlow: "transition-shadow duration-200 hover:shadow-lg dark:hover:shadow-[var(--glow-accent)]",

  // Smooth transition (general)
  smooth: "transition-all duration-200 ease-in-out",
} as const;

/**
 * Classes para respeitar prefers-reduced-motion
 */
export const motionSafe = {
  fadeInUp: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
  fadeIn: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
  scaleIn: "motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-150",
  hoverScale: "motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
  smooth: "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-in-out",
} as const;

/**
 * Stagger delays para animações em sequência
 */
export const staggerDelays = [
  "delay-0",
  "delay-75",
  "delay-150",
  "delay-300",
  "delay-500",
  "delay-700",
] as const;

/**
 * Easing curves customizados
 */
export const easings = {
  easeInOut: "ease-in-out",
  easeOut: "ease-out",
  easeIn: "ease-in",
  spring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Bounce effect
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)", // Material Design
} as const;
