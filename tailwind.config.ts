import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          elevated: "var(--card-elevated)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          hover: "var(--accent-hover)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        // `text`: variante de TEXTO do token (>=4.5:1 sobre --card). O DEFAULT
        // e cor de preenchimento e reprova como texto no tema claro — ver o
        // comentario em globals.css, secao "Semantic Colors".
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          bg: "var(--success-bg)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
          bg: "var(--warning-bg)",
          text: "var(--warning-text)",
        },
        error: {
          DEFAULT: "var(--error)",
          foreground: "var(--error-foreground)",
          bg: "var(--error-bg)",
        },
        info: {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
          bg: "var(--info-bg)",
          text: "var(--info-text)",
        },
        status: {
          partial: {
            DEFAULT: "var(--status-partial)",
            foreground: "var(--status-partial-foreground)",
          },
        },
        gradient: {
          cta: {
            from: "var(--gradient-cta-from)",
            to: "var(--gradient-cta-to)",
          },
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      spacing: {
        "form-gap": "var(--form-gap)",
        "section-gap": "var(--section-gap)",
        "card-padding": "var(--card-padding)",
      },
      height: {
        input: "var(--input-height)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
