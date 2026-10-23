import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterResponsive } from "@/components/toaster-responsive";
import { PWARegister } from "@/components/pwa-register";
import { scriptDeInicializacao } from "@/lib/modo-discreto";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Numeros (`.tabular-nums`) e valores de KPI. Terceira fonte: `swap` + so os
// pesos usados, para nao pesar no primeiro carregamento nem travar o texto.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ECEEEC" },
    { media: "(prefers-color-scheme: dark)", color: "#070807" },
  ],
};

export const metadata: Metadata = {
  title: "BFX Manager",
  description: "Gestão comercial BFX — vendas, financeiro e relatórios",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BFX Manager",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // As `.variable` ficam na tag raiz: é nela (`:root`) que o globals.css monta `--font-mono`,
    // `--font-sans` e `--font-display`. Presas ao body elas não existiam ali e a Geist Mono não aplicava.
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Modo discreto: aplica a escolha do aparelho ANTES da primeira pintura. Sem isto, quem
            deixou os valores ocultos veria os números por um instante até o React montar o botão —
            justamente o que o modo existe para evitar. Mesmo caminho do tema (next-themes). */}
        <script dangerouslySetInnerHTML={{ __html: scriptDeInicializacao() }} />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <ToasterResponsive />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
