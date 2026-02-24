import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
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

export const metadata: Metadata = {
  title: "BFX Manager",
  description: "Gestao comercial BFX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster 
            richColors 
            position="bottom-right"
            expand
            visibleToasts={4}
            closeButton
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
                title: "group-[.toast]:text-foreground group-[.toast]:font-semibold",
                description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
                actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
                cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
                closeButton: "group-[.toast]:bg-muted/50 group-[.toast]:text-muted-foreground group-[.toast]:border-border group-[.toast]:hover:bg-muted",
                success: "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/5 dark:group-[.toaster]:bg-success/10",
                error: "group-[.toaster]:border-error/30 group-[.toaster]:bg-error/5 dark:group-[.toaster]:bg-error/10",
                warning: "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/5 dark:group-[.toaster]:bg-warning/10",
                info: "group-[.toaster]:border-info/30 group-[.toaster]:bg-info/5 dark:group-[.toaster]:bg-info/10",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
