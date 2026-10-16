import Link from "next/link";
import { Home, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="anim-entrada w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-6 p-6">
          <div className="space-y-2">
            <p className="font-display text-6xl font-semibold tabular-nums text-muted-foreground">404</p>
            <h1 className="text-lg font-semibold text-foreground">Página não encontrada</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              O endereço que você acessou não existe ou foi movido.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonVariants()}>
              <Home className="h-4 w-4 shrink-0" />
              Início
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              <LogIn className="h-4 w-4 shrink-0" />
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
