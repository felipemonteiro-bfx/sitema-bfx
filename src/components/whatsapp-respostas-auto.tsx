"use client";

import { useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ESTADO_DESLIGADO, nadaEnviado, quemRespondePerguntas, type EstadoRespostasAuto } from "@/lib/whatsapp-respostas-auto";

/**
 * Respostas automáticas do WhatsApp em um controle só (spec 2026-10-17-whatsapp-respostas-auto-design).
 * O servidor decide o "estado se ligado" (modelo, segredo MCP, provedor, envios gerais) e passa só o
 * resultado; a chave do LiteLLM nunca chega aqui. Desligar o Switch troca a linha na hora.
 */
type Props = {
  /** Nome do campo no formulário (grava 2 quando ligado, nada quando desligado). */
  name: string;
  defaultLigado: boolean;
  estadoSeLigado: EstadoRespostasAuto;
};

const TOM: Record<EstadoRespostasAuto["tom"], string> = {
  ok: "bg-success-bg text-success-text",
  alerta: "bg-warning-bg text-warning-text",
  neutro: "bg-poco text-muted-foreground",
};

export function WhatsappRespostasAuto({ name, defaultLigado, estadoSeLigado }: Props) {
  const [ligado, setLigado] = useState(defaultLigado);
  const estado = ligado ? estadoSeLigado : ESTADO_DESLIGADO;
  // Sempre que nada é enviado (desligado, envios gerais off, provedor fora do ar) a tabela inteira diz Ninguém.
  const parado = !ligado || nadaEnviado(estadoSeLigado);
  const quemPergunta = parado ? "Ninguém" : quemRespondePerguntas(estadoSeLigado);

  return (
    <div className="space-y-4">
      <div className="flex min-h-11 items-start gap-4 rounded-interno bg-poco p-4">
        {/* O Radix só cria o input do formulário depois de hidratar; este garante o "on" no FormData. */}
        {ligado && <input type="hidden" name={name} value="on" />}
        {/* A descrição fica dentro do Label: a linha inteira liga e desliga o Switch. */}
        <Label htmlFor={name} variant="opcao" className="block flex-1">
          <span id="rot-respostas-auto" className="block font-semibold">
            Responder clientes automaticamente
          </span>
          <span id="desc-respostas-auto" className="mt-1 block text-sm text-muted-foreground">
            O sistema escolhe sozinho entre a IA e as respostas por regras. Quando alguém da equipe responde,
            o automático pausa naquela conversa.
          </span>
        </Label>
        <Switch
          id={name}
          checked={ligado}
          onCheckedChange={setLigado}
          aria-labelledby="rot-respostas-auto"
          aria-describedby="desc-respostas-auto"
        />
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cn("flex flex-col gap-2 rounded-interno px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3", TOM[estado.tom])}
      >
        <div className="flex flex-1 items-start gap-3">
          <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-current" />
          <span className="flex-1">
            <b className="font-semibold">{estado.titulo}</b> {estado.texto}
            {estado.aviso && <span className="mt-1 block text-xs">{estado.aviso}</span>}
          </span>
        </div>
        {estado.acao && (
          <Link href={estado.acao.href} className="pl-5 font-semibold underline underline-offset-4 sm:pl-0">
            {estado.acao.rotulo}
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Quem responde cada mensagem</h3>
        <Table>
          <TableCaption className="sr-only">Quem responde cada mensagem</TableCaption>
          <TableBody>
            <TableRow semHover>
              <TableCell>Saudação e menu</TableCell>
              <TableCell tom="muted">{parado ? "Ninguém" : "Regras · na hora, sem custo"}</TableCell>
            </TableRow>
            <TableRow semHover>
              <TableCell>ATENDENTE, SAIR ou PARAR</TableCell>
              <TableCell tom="muted">{parado ? "Ninguém" : "Sem resposta automática · o automático pausa"}</TableCell>
            </TableRow>
            <TableRow semHover>
              <TableCell>Perguntas sobre compras, parcelas, boletos e produtos</TableCell>
              <TableCell tom={quemPergunta === "IA com MCP" ? "sucesso" : "muted"} peso="forte">
                {quemPergunta}
              </TableCell>
            </TableRow>
            <TableRow semHover>
              <TableCell>A IA falhou ou passou de 20 s</TableCell>
              <TableCell tom="muted">{parado ? "Ninguém" : "Regras"}</TableCell>
            </TableRow>
            <TableRow semHover>
              <TableCell>Alguém da equipe assumiu a conversa</TableCell>
              <TableCell tom="muted">{parado ? "Ninguém" : "Ninguém · pausado"}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          A IA nunca informa preço nem confirma pagamento; escrever ATENDENTE chama a equipe.
        </p>
      </div>
    </div>
  );
}
