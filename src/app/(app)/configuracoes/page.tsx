import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { revalidatePath } from "next/cache";
import { QueryTabs } from "@/components/query-tabs";
import { Separator } from "@/components/ui/separator";
import { LogoUploadForm } from "@/components/logo-upload-form";
import { ReceiptEditorClient } from "@/components/receipt-editor-client";
import { WhatsAppConnect } from "@/components/whatsapp-connect";
import { LitellmModelSelect } from "@/components/litellm-model-select";
import { cn } from "@/lib/utils";

type Search = { tab?: string };

async function saveAviso(formData: FormData) {
  "use server";
  const msg = String(formData.get("mensagem") || "");
  await prisma.aviso.updateMany({ data: { ativo: 0 } });
  await prisma.aviso.create({ data: { mensagem: msg, ativo: 1 } });
  revalidatePath("/configuracoes");
}

async function saveContrato(formData: FormData) {
  "use server";
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloContrato: texto } });
  } else {
    await prisma.config.create({ data: { modeloContrato: texto } });
  }
  revalidatePath("/configuracoes");
}

async function saveReciboVenda(formData: FormData) {
  "use server";
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloReciboVenda: texto } });
  } else {
    await prisma.config.create({ data: { modeloReciboVenda: texto } });
  }
  revalidatePath("/configuracoes");
}

async function saveApiKey(formData: FormData) {
  "use server";
  const gkey = String(formData.get("gkey") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { geminiKey: gkey } });
  } else {
    await prisma.config.create({ data: { geminiKey: gkey } });
  }
  revalidatePath("/configuracoes");
}

async function saveAiProvider(formData: FormData) {
  "use server";
  const aiProvider = String(formData.get("aiProvider") || "gemini");
  const litellmUrl = String(formData.get("litellmUrl") || "").trim() || null;
  const litellmKey = String(formData.get("litellmKey") || "").trim() || null;
  const litellmModel = String(formData.get("litellmModel") || "").trim() || null;
  const cfg = await prisma.config.findFirst();
  const data = { aiProvider, litellmUrl, litellmKey, litellmModel } as Record<string, unknown>;
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data });
  } else {
    await prisma.config.create({ data });
  }
  revalidatePath("/configuracoes");
}

async function saveAsaas(formData: FormData) {
  "use server";
  const apiKey = String(formData.get("asaasApiKey") || "").trim() || null;
  const env = String(formData.get("asaasEnv") || "sandbox").trim();
  const asaasEnv = env === "production" ? "production" : "sandbox";
  const cfg = await prisma.config.findFirst();
  // Só sobrescreve a chave se uma nova foi digitada; preserva a existente caso contrário
  const data: Record<string, unknown> = { asaasEnv };
  if (apiKey !== null) data.asaasApiKey = apiKey;
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data });
  } else {
    await prisma.config.create({ data: { asaasEnv } });
  }
  revalidatePath("/configuracoes");
}

async function saveWhatsApp(formData: FormData) {
  "use server";
  const url = String(formData.get("evolutionApiUrl") || "").trim();
  const key = String(formData.get("evolutionApiKey") || "").trim();
  const instance = String(formData.get("evolutionInstance") || "bfx").trim() || "bfx";
  const enabled = formData.get("whatsappAutoEnabled") === "on" ? 1 : 0;
  const autoRecibo = formData.get("whatsappAutoRecibo") === "on" ? 1 : 0;
  const autoBoleto = formData.get("whatsappAutoBoleto") === "on" ? 1 : 0;
  const autoLembrete = formData.get("whatsappAutoLembrete") === "on" ? 1 : 0;
  const autoReativacao = formData.get("whatsappAutoReativacao") === "on" ? 1 : 0;
  const autoAniversario = formData.get("whatsappAutoAniversario") === "on" ? 1 : 0;
  const autoInadimplencia = formData.get("whatsappAutoInadimplencia") === "on" ? 1 : 0;
  const autoNPS = formData.get("whatsappAutoNPS") === "on" ? 1 : 0;
  const autoBoasVindas = formData.get("whatsappAutoBoasVindas") === "on" ? 1 : 0;
  const autoAgradecimento = formData.get("whatsappAutoAgradecimento") === "on" ? 1 : 0;
  const preAtendimento = formData.get("whatsappPreAtendimento") === "on" ? 1 : 0;
  const diasInativo = Math.max(30, Math.min(365, Number(formData.get("whatsappDiasInativo") || 60) || 60));
  const takeoverMinutos = Math.max(5, Math.min(480, Number(formData.get("whatsappTakeoverMinutos") || 60) || 60));
  const cfg = await prisma.config.findFirst();
  const data = {
    evolutionApiUrl: url || null,
    evolutionApiKey: key || null,
    evolutionInstance: instance,
    whatsappAutoEnabled: enabled,
    whatsappAutoRecibo: autoRecibo,
    whatsappAutoBoleto: autoBoleto,
    whatsappAutoLembrete: autoLembrete,
    whatsappAutoReativacao: autoReativacao,
    whatsappAutoAniversario: autoAniversario,
    whatsappAutoInadimplencia: autoInadimplencia,
    whatsappAutoNPS: autoNPS,
    whatsappAutoBoasVindas: autoBoasVindas,
    whatsappAutoAgradecimento: autoAgradecimento,
    whatsappDiasInativo: diasInativo,
    whatsappPreAtendimento: preAtendimento,
    whatsappTakeoverMinutos: takeoverMinutos,
  };
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data });
  } else {
    await prisma.config.create({ data });
  }
  revalidatePath("/configuracoes");
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;

  // Proteção contra colunas ausentes no banco de produção
  let aviso: Awaited<ReturnType<typeof prisma.aviso.findFirst>> = null;
  let cfg: Awaited<ReturnType<typeof prisma.config.findFirst>> = null;
  try {
    aviso = await prisma.aviso.findFirst({ where: { ativo: 1 }, orderBy: { id: "desc" } });
  } catch {
    // Tabela aviso pode não existir em ambientes antigos
  }
  try {
    cfg = await prisma.config.findFirst();
  } catch {
    // Tabela config pode ter colunas ausentes em produção
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize comunicados, recibos e integrações.</p>
      </div>
      <QueryTabs
        defaultTab={sp.tab || "mural"}
        tabs={[
          {
            value: "mural",
            label: "Mural",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Mensagem para vendedores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 text-sm text-muted-foreground">
                    Esta mensagem aparece no painel dos vendedores.
                  </div>
                  <form action={saveAviso} className="space-y-3">
                    <Textarea name="mensagem" defaultValue={aviso?.mensagem || ""} />
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Publicar aviso</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "recibo",
            label: "Recibo",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Modelos de Recibo e Logo</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure os dois tipos de recibo: padrão de venda de mercadoria e autorização de desconto em folha.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-8">
                    <LogoUploadForm currentLogoPath={cfg?.logoPath ?? undefined} />
                    <Separator />
                    <ReceiptEditorClient
                      titulo="1. Recibo de Venda de Mercadoria"
                      descricao="Documento padrão de comprovante de compra. Placeholders: {CLIENTE}, {MATRICULA}, {PRODUTO}, {VALOR}, {PARCELAS}, {DATA}."
                      initialText={cfg?.modeloReciboVenda ?? "Declaro ter recebido o(s) produto(s) acima descrito(s) e estar ciente das condições da compra. Este documento serve como comprovante de venda de mercadoria."}
                      logoPath={cfg?.logoPath ?? undefined}
                      saveAction={saveReciboVenda}
                      previewLabel="Prévia do Recibo de Venda"
                    />
                    <Separator />
                    <ReceiptEditorClient
                      titulo="2. Autorização de Desconto em Folha"
                      descricao="Texto da autorização para descontos em folha. Placeholders: {CLIENTE}, {MATRICULA}, {PRODUTO}, {VALOR}, {PARCELAS}, {DATA}."
                      initialText={cfg?.modeloContrato ?? "RECIBO Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x. Data: {DATA}. Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa."}
                      logoPath={cfg?.logoPath ?? undefined}
                      saveAction={saveContrato}
                      previewLabel="Prévia da Autorização de Desconto em Folha"
                    />
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "asaas",
            label: "Asaas",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Integração Asaas (Boletos)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure a API Key do Asaas para geração de boletos. As chaves aqui têm prioridade sobre
                    as variáveis de ambiente ASAAS_API_KEY e ASAAS_ENV.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={saveAsaas} className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">API Key</div>
                      <Input
                        name="asaasApiKey"
                        type="password"
                        placeholder={(cfg as { asaasApiKey?: string | null })?.asaasApiKey ? "•••••••• (salva)" : "$aas_xxxxxxxxxxxxxxxx"}
                      />
                      {(cfg as { asaasApiKey?: string | null })?.asaasApiKey && (
                        <div className="text-xs text-muted-foreground">Chave Asaas salva.</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Ambiente</div>
                      <select
                        name="asaasEnv"
                        defaultValue={(cfg as { asaasEnv?: string | null })?.asaasEnv || "sandbox"}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="sandbox">Sandbox (testes)</option>
                        <option value="production">Produção</option>
                      </select>
                      <div className="text-xs text-muted-foreground">
                        Use sandbox para testes; produção para boletos reais.
                      </div>
                    </div>
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "ia",
            label: "IA",
            content: (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Provedor de IA</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Escolha qual IA usar no BFX Intelligence. Use LiteLLM para conectar qualquer modelo via API compatível com OpenAI.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form action={saveAiProvider} className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">Provedor ativo</div>
                        <select
                          name="aiProvider"
                          defaultValue={(cfg as Record<string, unknown>)?.aiProvider as string || "gemini"}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="gemini">Gemini</option>
                          <option value="openai">OpenAI</option>
                          <option value="litellm">LiteLLM (custom)</option>
                        </select>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="text-xs font-semibold text-muted-foreground">Configuração LiteLLM</div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">URL da API</div>
                          <Input
                            name="litellmUrl"
                            placeholder="https://ai.softlive.dev"
                            defaultValue={(cfg as Record<string, unknown>)?.litellmUrl as string || ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">API Key</div>
                          <Input
                            name="litellmKey"
                            type="password"
                            placeholder={(cfg as Record<string, unknown>)?.litellmKey ? "•••••••• (salva)" : "sk-..."}
                          />
                          {Boolean((cfg as Record<string, unknown>)?.litellmKey) && (
                            <div className="text-xs text-muted-foreground">Chave LiteLLM salva.</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Modelo</div>
                          <LitellmModelSelect
                            name="litellmModel"
                            defaultValue={(cfg as Record<string, unknown>)?.litellmModel as string || ""}
                          />
                          <div className="text-xs text-muted-foreground">
                            Lista carregada da sua instância LiteLLM. Salve a URL e chave primeiro se não aparecer.
                          </div>
                        </div>
                      </div>
                      <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                    </form>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Gemini API Key</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form action={saveApiKey} className="space-y-3">
                      <Input
                        name="gkey"
                        type="password"
                        placeholder={cfg?.geminiKey ? "•••••••• (salva)" : "Gemini API Key"}
                      />
                      {cfg?.geminiKey && (
                        <div className="text-xs text-muted-foreground">Chave Gemini salva.</div>
                      )}
                      <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            value: "whatsapp",
            label: "WhatsApp",
            content: (
              <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conexão WhatsApp</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code para conectar a conta do WhatsApp. Requer a Evolution API configurada abaixo.
                  </p>
                </CardHeader>
                <CardContent>
                  <WhatsAppConnect />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Integração WhatsApp (Evolution API)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure a Evolution API para envio automático de recibos, links de assinatura, boletos e lembretes
                    de parcelas. Solução gratuita e open-source.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={saveWhatsApp} className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">URL da Evolution API</div>
                      <Input
                        name="evolutionApiUrl"
                        placeholder="https://sua-evolution.exemplo.com"
                        defaultValue={cfg?.evolutionApiUrl ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">API Key</div>
                      <Input
                        name="evolutionApiKey"
                        type="password"
                        placeholder={cfg?.evolutionApiKey ? "•••••••• (salva)" : "Chave da Evolution API"}
                      />
                      {cfg?.evolutionApiKey && (
                        <div className="text-xs text-muted-foreground">Chave salva.</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Nome da instância</div>
                      <Input
                        name="evolutionInstance"
                        placeholder="bfx"
                        defaultValue={cfg?.evolutionInstance ?? "bfx"}
                      />
                      <div className="text-xs text-muted-foreground">
                        Nome da instância criada na Evolution API (ex.: bfx).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="whatsappAutoEnabled"
                        name="whatsappAutoEnabled"
                        defaultChecked={cfg?.whatsappAutoEnabled !== 0}
                        className="rounded border-border"
                      />
                      <label htmlFor="whatsappAutoEnabled" className="text-sm font-medium">
                        Envios automáticos ativados (master)
                      </label>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-xs font-semibold text-muted-foreground">
                        O que enviar automaticamente
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoRecibo"
                            name="whatsappAutoRecibo"
                            defaultChecked={cfg?.whatsappAutoRecibo !== 0}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoRecibo" className="text-sm">
                            Recibo ou link de assinatura após venda
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoBoleto"
                            name="whatsappAutoBoleto"
                            defaultChecked={cfg?.whatsappAutoBoleto !== 0}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoBoleto" className="text-sm">
                            Link do boleto ao gerar (manual ou venda)
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoLembrete"
                            name="whatsappAutoLembrete"
                            defaultChecked={cfg?.whatsappAutoLembrete !== 0}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoLembrete" className="text-sm">
                            Lembrete de parcelas (boleto, 1–2 dias antes)
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoInadimplencia"
                            name="whatsappAutoInadimplencia"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoInadimplencia === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoInadimplencia" className="text-sm">
                            Parcela vencida (lembrete inadimplência)
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoReativacao"
                            name="whatsappAutoReativacao"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoReativacao === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoReativacao" className="text-sm">
                            Reativação clientes inativos
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            id="whatsappDiasInativo"
                            name="whatsappDiasInativo"
                            min={30}
                            max={365}
                            defaultValue={String(Number((cfg as Record<string, unknown>)?.whatsappDiasInativo) || 60)}
                            className="h-8 w-16 rounded border border-border px-2 text-sm"
                          />
                          <label htmlFor="whatsappDiasInativo" className="text-sm">
                            dias sem compra para reativação
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoAniversario"
                            name="whatsappAutoAniversario"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoAniversario === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoAniversario" className="text-sm">
                            Parabéns no aniversário
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoBoasVindas"
                            name="whatsappAutoBoasVindas"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoBoasVindas === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoBoasVindas" className="text-sm">
                            Boas-vindas cliente novo
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoAgradecimento"
                            name="whatsappAutoAgradecimento"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoAgradecimento === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoAgradecimento" className="text-sm">
                            Agradecimento pós-venda (1 dia depois)
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="whatsappAutoNPS"
                            name="whatsappAutoNPS"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoNPS === 1}
                            className="rounded border-border"
                          />
                          <label htmlFor="whatsappAutoNPS" className="text-sm">
                            Pesquisa satisfação (7 dias após compra)
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="whatsappPreAtendimento"
                          name="whatsappPreAtendimento"
                          defaultChecked={(cfg as Record<string, unknown>)?.whatsappPreAtendimento === 1}
                          className="rounded border-border"
                        />
                        <label htmlFor="whatsappPreAtendimento" className="text-sm font-medium">
                          Pré-atendimento por IA
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <input
                          type="number"
                          id="whatsappTakeoverMinutos"
                          name="whatsappTakeoverMinutos"
                          min={5}
                          max={480}
                          defaultValue={String(Number((cfg as Record<string, unknown>)?.whatsappTakeoverMinutos) || 60)}
                          className="h-8 w-16 rounded border border-border px-2 text-sm"
                        />
                        <label htmlFor="whatsappTakeoverMinutos" className="text-sm">
                          minutos de pausa após atendente assumir (padrão: 60)
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        Quem mandar mensagem no WhatsApp é atendido por uma IA com acesso ao catálogo de produtos.
                        Configure o webhook MESSAGES_UPSERT na Evolution API para:
                      </p>
                      <div className="pl-6 flex flex-wrap items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                          {(() => {
                            const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://seu-dominio.com";
                            return `${base}/api/webhooks/evolution`;
                          })()}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          (defina NEXT_PUBLIC_APP_URL no .env)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Alternativa: use variáveis de ambiente EVOLUTION_API_URL, EVOLUTION_API_KEY e
                      EVOLUTION_INSTANCE.
                    </p>
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                  </form>
                </CardContent>
              </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
