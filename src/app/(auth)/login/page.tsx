"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoginPainelMarca } from "@/components/login-painel-marca";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormData) {
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Usuário ou senha incorretos.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Verifique a internet e tente de novo.");
    }
  }


  return (
    <div className="flex min-h-screen flex-wrap gap-4 bg-background p-4">
      {/* No celular o formulario vem primeiro; o painel de marca e enfeite. */}
      <div className="order-2 flex min-w-0 flex-[1_1_32.5rem] min-[960px]:order-1">
        <LoginPainelMarca />
      </div>
      <main className="order-1 flex min-w-0 flex-[1_1_26rem] items-center justify-center px-0 py-6 sm:px-4 sm:py-10 min-[960px]:order-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="anim-entrada flex w-full max-w-[25rem] flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              {/* `<h1>` de verdade: o titulo era um `CardTitle`, que renderiza
                  `<div>`, e a pagina ficava sem nenhum cabecalho de nivel 1 — o
                  leitor de tela nao tinha como anunciar do que se trata a tela.
                  Fase 18, achado 9. */}
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Entrar</h1>
              <p className="text-base text-muted-foreground">
                Use o usuário e a senha que a administração cadastrou para você.
              </p>
            </div>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    {/* Sem placeholder de exemplo: "admin" ali entregava o nome
                        do usuario administrador a qualquer visitante. */}
                    <Input
                      {...field}
                      inputSize="lg"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        type={mostrarSenha ? "text" : "password"}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        inputSize="lg"
                        className="pr-14"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="discretoPlano"
                      size="icon"
                      onClick={() => setMostrarSenha((v) => !v)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={mostrarSenha}
                      className="absolute right-0.5 top-0.5 h-11 w-11"
                    >
                      {mostrarSenha ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={form.formState.isSubmitting}
              loadingText="Entrando…"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Entrar
            </Button>
            {/* Sempre no DOM: o role="alert" so anuncia quando o texto muda
                dentro de uma regiao que ja existia. Vazia, `empty:` zera o
                padding e o fundo para nao sobrar uma caixa vermelha. */}
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-controle bg-error-bg p-3 text-sm text-error-text empty:bg-transparent empty:p-0"
            >
              {error ? (
                <>
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </>
              ) : null}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
