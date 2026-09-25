"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background to-muted" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          {/* `<h1>` de verdade: o titulo era um `CardTitle`, que renderiza
              `<div>`, e a pagina ficava sem nenhum cabecalho de nivel 1 — o
              leitor de tela nao tinha como anunciar do que se trata a tela.
              As classes reproduzem exatamente o que o `CardTitle` aplicava
              (`text-lg font-semibold leading-none tracking-tight` com o
              `text-2xl` por cima), entao nada muda visualmente.
              Fase 18, achado 9. */}
          <h1 className="text-2xl font-semibold leading-none tracking-tight">BFX Manager</h1>
          <p className="text-sm text-muted-foreground">Acesso seguro ao painel</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          className="pr-11"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setMostrarSenha((v) => !v)}
                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={mostrarSenha}
                        className="absolute right-0 top-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground hover:shadow-none"
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Sempre no DOM: o role="alert" so anuncia quando o texto muda
                  dentro de uma regiao que ja existia. */}
              <p role="alert" className="min-h-5 text-sm text-error-text">
                {error}
              </p>
              <Button
                type="submit"
                className="w-full"
                loading={form.formState.isSubmitting}
                loadingText="Entrando…"
              >
                Entrar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
