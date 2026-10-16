import { prisma } from "@/lib/db";
import { requireAdmin, requireAdminOrThrow } from "@/lib/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button-variants";
import { revalidarConfig } from "@/lib/revalidacao";
import { redirect } from "next/navigation";
import { QueryTabs } from "@/components/query-tabs";
import { Separator } from "@/components/ui/separator";
import { LogoUploadForm } from "@/components/logo-upload-form";
import { ReceiptEditorClient } from "@/components/receipt-editor-client";
import { WhatsAppConnect } from "@/components/whatsapp-connect";
import { LitellmModelSelect } from "@/components/litellm-model-select";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { checkboxComoNumero } from "@/lib/form-values";
import { PageHeader } from "@/components/page-header";
import { SettingsSaveButton } from "@/components/settings-save-button";
import { WebhookAsaasCard } from "@/components/webhook-asaas-card";
import { formatarUltimoAviso, mascararToken, statusWebhookAsaas, urlWebhookAsaas } from "@/lib/webhook-asaas-token";
import { headers } from "next/headers";
import { normalizarEmailFinanceiro } from "@/lib/alertas-obrigacoes";

type Search = { tab?: string; saved?: string; error?: string };

/**
 * E-mail do financeiro (2026-09-30, Fase 4): recebe os alertas de obrigação da Prudent que pedem
 * e-mail (o "Pix não entrou", Fase 6). Vazio apaga; sem ele, só a notificação interna.
 */
async function saveEmailFinanceiro(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const r = normalizarEmailFinanceiro(formData.get("emailFinanceiro"));
  if (!r.ok) redirect("/configuracoes?tab=email&error=email_financeiro_invalido");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { emailFinanceiro: r.valor } });
  } else {
    await prisma.config.create({ data: { emailFinanceiro: r.valor } });
  }
  revalidarConfig();
}

async function saveAviso(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const msg = String(formData.get("mensagem") || "");
  await prisma.aviso.updateMany({ data: { ativo: 0 } });
  await prisma.aviso.create({ data: { mensagem: msg, ativo: 1 } });
  revalidarConfig();
}

async function saveContrato(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloContrato: texto } });
  } else {
    await prisma.config.create({ data: { modeloContrato: texto } });
  }
  revalidarConfig();
}

async function saveReciboVenda(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const texto = String(formData.get("texto") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { modeloReciboVenda: texto } });
  } else {
    await prisma.config.create({ data: { modeloReciboVenda: texto } });
  }
  revalidarConfig();
}

async function saveApiKey(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const gkey = String(formData.get("gkey") || "");
  const cfg = await prisma.config.findFirst();
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data: { geminiKey: gkey } });
  } else {
    await prisma.config.create({ data: { geminiKey: gkey } });
  }
  revalidarConfig();
}

async function saveAiProvider(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const aiProvider = String(formData.get("aiProvider") || "gemini");
  const litellmUrl = String(formData.get("litellmUrl") || "").trim() || null;
  // Campo password vem sempre vazio no reload: so sobrescreve a chave quando o
  // admin digitar uma nova (mesmo padrao do Asaas/Meta). Sem isso, salvar o
  // formulario apagava a chave e a listagem de /v1/models voltava vazia.
  const litellmKey = String(formData.get("litellmKey") || "").trim();
  const litellmModel = String(formData.get("litellmModel") || "").trim() || null;
  const cfg = await prisma.config.findFirst();
  const data = {
    aiProvider,
    litellmUrl,
    litellmModel,
    ...(litellmKey ? { litellmKey } : {}),
  } as Record<string, unknown>;
  if (cfg) {
    await prisma.config.update({ where: { id: cfg.id }, data });
  } else {
    await prisma.config.create({ data });
  }
  revalidarConfig();
}

async function saveAsaas(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  try {
    const apiKey = String(formData.get("asaasApiKey") || "").trim() || null;
    const env = String(formData.get("asaasEnv") || "sandbox").trim();
    const asaasEnv = env === "production" ? "production" : "sandbox";
    const cfg = await prisma.config.findFirst();
    const data: Record<string, unknown> = { asaasEnv };
    if (apiKey !== null) data.asaasApiKey = apiKey;
    if (cfg) {
      await prisma.config.update({ where: { id: cfg.id }, data });
    } else {
      await prisma.config.create({ data: { asaasEnv, ...(apiKey ? { asaasApiKey: apiKey } : {}) } });
    }
    revalidarConfig();
  } catch (err) {
    console.error("[saveAsaas] Erro ao salvar configuracao Asaas:", err);
    redirect("/configuracoes?error=asaas_save_failed");
  }
}

async function saveWhatsApp(formData: FormData) {
  "use server";
  await requireAdminOrThrow();
  const url = String(formData.get("evolutionApiUrl") || "").trim();
  const key = String(formData.get("evolutionApiKey") || "").trim();
  const instance = String(formData.get("evolutionInstance") || "bfx").trim() || "bfx";
  const enabled = checkboxComoNumero(formData.get("whatsappAutoEnabled"));
  const autoRecibo = checkboxComoNumero(formData.get("whatsappAutoRecibo"));
  const autoBoleto = checkboxComoNumero(formData.get("whatsappAutoBoleto"));
  const autoLembrete = checkboxComoNumero(formData.get("whatsappAutoLembrete"));
  const autoReativacao = checkboxComoNumero(formData.get("whatsappAutoReativacao"));
  const autoAniversario = checkboxComoNumero(formData.get("whatsappAutoAniversario"));
  const autoInadimplencia = checkboxComoNumero(formData.get("whatsappAutoInadimplencia"));
  const autoNPS = checkboxComoNumero(formData.get("whatsappAutoNPS"));
  const autoBoasVindas = checkboxComoNumero(formData.get("whatsappAutoBoasVindas"));
  const autoAgradecimento = checkboxComoNumero(formData.get("whatsappAutoAgradecimento"));
  const preAtendimento = formData.get("whatsappPreAtendimento") === "2" ? 2 : checkboxComoNumero(formData.get("whatsappPreAtendimento"));
  const diasInativo = Math.max(30, Math.min(365, Number(formData.get("whatsappDiasInativo") || 60) || 60));
  const takeoverMinutos = Math.max(5, Math.min(480, Number(formData.get("whatsappTakeoverMinutos") || 60) || 60));
  // Provider oficial (Meta Cloud API) — token so e sobrescrito se informado (padrao Asaas).
  const provider = String(formData.get("whatsappProvider") || "evolution").trim() === "meta_cloud" ? "meta_cloud" : "evolution";
  const metaToken = String(formData.get("metaWhatsappToken") || "").trim();
  const metaPhoneId = String(formData.get("metaWhatsappPhoneNumberId") || "").trim();
  const metaBusinessId = String(formData.get("metaWhatsappBusinessId") || "").trim();
  const metaApiVersion = String(formData.get("metaWhatsappApiVersion") || "v21.0").trim() || "v21.0";
  const metaVerifyToken = String(formData.get("metaWebhookVerifyToken") || "").trim();
  const metaAppSecret = String(formData.get("metaAppSecret") || "").trim();
  if ((metaPhoneId && !/^\d+$/.test(metaPhoneId)) || (metaBusinessId && !/^\d+$/.test(metaBusinessId))) {
    redirect("/configuracoes?tab=whatsapp&error=whatsapp_invalid_ids");
  }
  const fallbackEvolution = checkboxComoNumero(formData.get("whatsappFallbackEvolution"));
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
    whatsappProvider: provider,
    metaWhatsappPhoneNumberId: metaPhoneId || null,
    metaWhatsappBusinessId: metaBusinessId || null,
    metaWhatsappApiVersion: metaApiVersion,
    metaWebhookVerifyToken: metaVerifyToken || null,
    whatsappFallbackEvolution: fallbackEvolution,
    ...(metaToken ? { metaWhatsappToken: metaToken } : {}),
    ...(metaAppSecret ? { metaAppSecret } : {}),
  };
  try {
    const cfg = await prisma.config.findFirst();
    if (cfg) {
      await prisma.config.update({ where: { id: cfg.id }, data });
    } else {
      await prisma.config.create({ data });
    }
  } catch {
    redirect("/configuracoes?tab=whatsapp&error=whatsapp_save_failed");
  }
  revalidarConfig();
  redirect("/configuracoes?tab=whatsapp&saved=whatsapp");
}

async function saveUber(formData: FormData) {
  "use server";
  // Escreve client_secret OAuth — superfície sensível nova; requireAdmin() na página só
  // protege a renderização, não a server action em si (achado #4 da revisão do Grok).
  await requireAdminOrThrow();

  const street = String(formData.get("uberPickupStreet") || "").trim();
  const city = String(formData.get("uberPickupCity") || "").trim();
  const state = String(formData.get("uberPickupState") || "").trim();
  const zip = String(formData.get("uberPickupZip") || "").trim();
  const country = String(formData.get("uberPickupCountry") || "").trim() || "BR";
  const enderecoPreenchido = Boolean(street || city || state || zip);
  const enderecoCompleto = Boolean(street && city && state && zip);
  // classificarProntidaoUber só exige street_address não-vazio para considerar o endereço
  // "pronto" — um endereço com só a rua preenchida passaria essa checagem e pareceria
  // pronto sem ser aceito pela Uber de verdade (achado #5 da revisão do Grok). Exige os 4
  // campos ou nenhum, antes de tocar no banco.
  if (enderecoPreenchido && !enderecoCompleto) {
    redirect("/configuracoes?tab=uber&error=uber_pickup_incompleto");
  }

  try {
    const clientId = String(formData.get("uberClientId") || "").trim() || null;
    // Campo sensível: só sobrescreve quando o admin digitar um novo valor (mesmo padrão
    // do Asaas/Meta/LiteLLM) — senão salvar o formulário apagaria o client_secret e a
    // cotação Uber pararia de funcionar até alguém redigitar.
    const clientSecret = String(formData.get("uberClientSecret") || "").trim();
    const customerId = String(formData.get("uberCustomerId") || "").trim() || null;
    const organizationId = String(formData.get("uberOrganizationId") || "").trim() || null;
    const enabled = checkboxComoNumero(formData.get("uberEnabled"));

    const uberPickupAddress = enderecoCompleto
      ? JSON.stringify({ street_address: [street], city, state, zip_code: zip, country })
      : null;

    const cfg = await prisma.config.findFirst();
    const data: Record<string, unknown> = {
      uberClientId: clientId,
      uberCustomerId: customerId,
      uberOrganizationId: organizationId,
      uberEnabled: enabled,
      uberPickupAddress,
      ...(clientSecret ? { uberClientSecret: clientSecret } : {}),
    };
    if (cfg) {
      await prisma.config.update({ where: { id: cfg.id }, data });
    } else {
      await prisma.config.create({ data });
    }
    revalidarConfig();
  } catch (err) {
    console.error("[saveUber] Erro ao salvar configuracao Uber:", err);
    redirect("/configuracoes?error=uber_save_failed");
  }
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

  // Webhook do Asaas: a página recebe só o token mascarado (o completo sai por action, ao copiar).
  const headerList = await headers();
  const webhookAsaas = {
    url: urlWebhookAsaas(process.env.NEXT_PUBLIC_APP_URL, headerList.get("x-forwarded-host") ?? headerList.get("host")),
    tokenMascarado: mascararToken(cfg?.asaasWebhookToken),
    status: statusWebhookAsaas({ token: cfg?.asaasWebhookToken ?? null, ultimoAvisoEm: cfg?.asaasWebhookUltimoAvisoEm ?? null }),
    ultimoAviso: cfg?.asaasWebhookUltimoAvisoEm ? formatarUltimoAviso(cfg.asaasWebhookUltimoAvisoEm) : null,
  };

  // Endereço de coleta salvo como JSON (mesmo formato de UBER_PICKUP_ADDRESS_JSON) — aqui
  // vira 5 campos separados só para a UI ser preenchível sem exigir digitar JSON à mão.
  let uberPickup: { street: string; city: string; state: string; zip: string; country: string } = {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "BR",
  };
  try {
    const raw = (cfg as Record<string, unknown> | null)?.uberPickupAddress as string | undefined;
    if (raw) {
      const parsed = JSON.parse(raw) as {
        street_address?: string[];
        city?: string;
        state?: string;
        zip_code?: string;
        country?: string;
      };
      uberPickup = {
        street: Array.isArray(parsed.street_address) ? parsed.street_address.join(", ") : "",
        city: parsed.city ?? "",
        state: parsed.state ?? "",
        zip: parsed.zip_code ?? "",
        country: parsed.country ?? "BR",
      };
    }
  } catch {
    // uberPickupAddress salvo anteriormente com JSON inválido — campos ficam vazios
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Personalize comunicados, recibos e integrações."
        breadcrumbs={[{ label: "Configurações" }]}
      />
      {sp.tab === "whatsapp" && sp.saved === "whatsapp" && !sp.error && (
        <div role="status" className="rounded-lg border border-success bg-success-bg p-4 font-medium text-success-text">
          Configurações do WhatsApp salvas. A chave permanece oculta por segurança. Salvar não comprova a conexão nem ativa os envios por si só.
        </div>
      )}
      {sp.tab === "whatsapp" && (sp.error === "whatsapp_save_failed" || sp.error === "whatsapp_invalid_ids") && (
        <div role="alert" className="rounded-lg border border-error bg-error-bg p-4 font-medium text-error-text">
          {sp.error === "whatsapp_invalid_ids" ? "Não foi salvo: os IDs da Meta devem conter somente números. Confira os campos e tente novamente." : "Não foi possível confirmar o salvamento. Confira a conexão e tente novamente."}
        </div>
      )}
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
                    <Label htmlFor="mensagem" className="normal-case tracking-normal text-sm font-medium">Mensagem</Label>
                    <Textarea id="mensagem" name="mensagem" defaultValue={aviso?.mensagem || ""} />
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
              <div className="space-y-4">
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
                        <Label htmlFor="asaasApiKey" className="normal-case tracking-normal text-sm font-medium">API Key</Label>
                        <Input
                          id="asaasApiKey"
                          name="asaasApiKey"
                          type="password"
                          placeholder={(cfg as { asaasApiKey?: string | null })?.asaasApiKey ? "•••••••• (salva)" : "$aas_xxxxxxxxxxxxxxxx"}
                        />
                        {(cfg as { asaasApiKey?: string | null })?.asaasApiKey && (
                          <div className="text-xs text-muted-foreground">Chave Asaas salva.</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="normal-case tracking-normal text-sm font-medium">Ambiente</Label>
                        <FormSelect
                          name="asaasEnv"
                          options={[
                            { value: "sandbox", label: "Sandbox (testes)" },
                            { value: "production", label: "Producao" },
                          ]}
                          defaultValue={(cfg as { asaasEnv?: string | null })?.asaasEnv || "sandbox"}
                          searchable={false}
                        />
                        <div className="text-xs text-muted-foreground">
                          Use sandbox para testes; produção para boletos reais.
                        </div>
                      </div>
                      <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                    </form>
                  </CardContent>
                </Card>
                <WebhookAsaasCard {...webhookAsaas} />
              </div>
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
                        <Label className="normal-case tracking-normal text-sm font-medium">Provedor ativo</Label>
                        <FormSelect
                          name="aiProvider"
                          options={[
                            { value: "gemini", label: "Gemini" },
                            { value: "openai", label: "OpenAI" },
                            { value: "litellm", label: "LiteLLM / Proxy" },
                          ]}
                          defaultValue={(cfg as Record<string, unknown>)?.aiProvider as string || "gemini"}
                          searchable={false}
                        />
                      </div>
                      <div className="rounded-interno bg-poco p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground">Configuração LiteLLM</p>
                        <div className="space-y-1">
                          <Label htmlFor="litellmUrl" className="normal-case tracking-normal text-sm font-medium">URL da API</Label>
                          <Input
                            id="litellmUrl"
                            name="litellmUrl"
                            placeholder="https://ai.softlive.dev"
                            defaultValue={(cfg as Record<string, unknown>)?.litellmUrl as string || ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="litellmKey" className="normal-case tracking-normal text-sm font-medium">API Key</Label>
                          <Input
                            id="litellmKey"
                            name="litellmKey"
                            type="password"
                            placeholder={(cfg as Record<string, unknown>)?.litellmKey ? "•••••••• (salva)" : "sk-..."}
                          />
                          {Boolean((cfg as Record<string, unknown>)?.litellmKey) && (
                            <div className="text-xs text-muted-foreground">Chave LiteLLM salva.</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="litellmModel" className="normal-case tracking-normal text-sm font-medium">Modelo</Label>
                          <LitellmModelSelect
                            name="litellmModel"
                            defaultValue={(cfg as Record<string, unknown>)?.litellmModel as string || ""}
                          />
                          <div className="text-xs text-muted-foreground">
                            Lista carregada de <code>/v1/models</code> da sua instância LiteLLM, usando a URL e a
                            chave digitadas acima — não é preciso salvar antes.
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
                    Confira o provedor selecionado e as pendências da conexão. Salve alterações abaixo antes de atualizar este cartão.
                  </p>
                </CardHeader>
                <CardContent>
                  <WhatsAppConnect />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Integração WhatsApp</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure o provedor para recibos, links de assinatura, boletos e lembretes
                    de parcelas. Tarifas e limites dependem do serviço selecionado.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={saveWhatsApp} className="space-y-4">
                    {/* Provider oficial (Meta Cloud API) — sem risco de ban do numero */}
                    {/* Agrupamento neutro (card interno), sem tint de estado: o agrupamento vem do titulo
                        "Provider de envio" e do degrau de superficie. */}
                    <div className="space-y-3 rounded-interno bg-card-elevated p-4">
                      <div className="text-sm font-semibold text-foreground">Provider de envio</div>
                      <div className="space-y-1">
                        <Label htmlFor="whatsappProvider" className="normal-case tracking-normal text-sm font-medium">Qual API usar</Label>
                        <FormSelect
                          id="whatsappProvider"
                          name="whatsappProvider"
                          defaultValue={String((cfg as Record<string, unknown>)?.whatsappProvider ?? "evolution")}
                          searchable={false}
                          className="max-w-xs"
                          options={[
                            { value: "evolution", label: "Evolution API (não-oficial)" },
                            { value: "meta_cloud", label: "Meta WhatsApp Cloud API (oficial)" },
                          ]}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="metaWhatsappToken" className="normal-case tracking-normal text-sm font-medium">Meta — Token permanente</Label>
                          <Input
                            id="metaWhatsappToken"
                            name="metaWhatsappToken"
                            type="password"
                            placeholder={(cfg as Record<string, unknown>)?.metaWhatsappToken ? "•••••••• (salvo)" : "System User token"}
                          />
                          {Boolean((cfg as Record<string, unknown>)?.metaWhatsappToken) && <p className="text-xs font-medium text-success-text">Token permanente salvo. Deixe vazio para manter.</p>}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="metaWhatsappPhoneNumberId" className="normal-case tracking-normal text-sm font-medium">Meta — Phone Number ID</Label>
                          <Input
                            id="metaWhatsappPhoneNumberId"
                            name="metaWhatsappPhoneNumberId"
                            placeholder="123456789012345"
                            defaultValue={String((cfg as Record<string, unknown>)?.metaWhatsappPhoneNumberId ?? "")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="metaWhatsappBusinessId" className="normal-case tracking-normal text-sm font-medium">Meta — Business Account ID</Label>
                          <Input
                            id="metaWhatsappBusinessId"
                            name="metaWhatsappBusinessId"
                            placeholder="opcional"
                            defaultValue={String((cfg as Record<string, unknown>)?.metaWhatsappBusinessId ?? "")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="metaWhatsappApiVersion" className="normal-case tracking-normal text-sm font-medium">Meta — Versão da API</Label>
                          <Input
                            id="metaWhatsappApiVersion"
                            name="metaWhatsappApiVersion"
                            placeholder="v21.0"
                            defaultValue={String((cfg as Record<string, unknown>)?.metaWhatsappApiVersion ?? "v21.0")}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="metaAppSecret" className="normal-case tracking-normal text-sm font-medium">Meta — Chave secreta do aplicativo</Label>
                          <Input
                            id="metaAppSecret"
                            name="metaAppSecret"
                            type="password"
                            autoComplete="new-password"
                            placeholder={(cfg as Record<string, unknown>)?.metaAppSecret ? "•••••••• (salvo; deixe vazio para manter)" : "Chave do aplicativo para validar os eventos recebidos"}
                          />
                          <p className="text-xs text-muted-foreground">A chave salva não é exibida. Informe-a somente nesta tela administrativa.</p>
                          {Boolean((cfg as Record<string, unknown>)?.metaAppSecret) && <p className="text-sm font-medium text-success-text">Chave secreta salva. Deixe vazio para manter a chave atual.</p>}
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="metaWebhookVerifyToken" className="normal-case tracking-normal text-sm font-medium">Meta — Verify token do webhook</Label>
                          <Input
                            id="metaWebhookVerifyToken"
                            name="metaWebhookVerifyToken"
                            placeholder="token de verificação do webhook"
                            defaultValue={String((cfg as Record<string, unknown>)?.metaWebhookVerifyToken ?? "")}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="whatsappFallbackEvolution"
                          name="whatsappFallbackEvolution"
                          defaultChecked={(cfg as Record<string, unknown>)?.whatsappFallbackEvolution !== 0}
                        />
                        <Label htmlFor="whatsappFallbackEvolution" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                          Usar Evolution como fallback se o Meta falhar (durante a transição)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Webhook do Meta: aponte para <code>…/api/webhooks/meta-whatsapp</code>. Mensagens
                        automáticas (lembrete, cobrança, etc.) exigem templates aprovados no Meta.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="evolutionApiUrl" className="normal-case tracking-normal text-sm font-medium">URL da Evolution API</Label>
                      <Input
                        id="evolutionApiUrl"
                        name="evolutionApiUrl"
                        placeholder="https://sua-evolution.exemplo.com"
                        defaultValue={cfg?.evolutionApiUrl ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="evolutionApiKey" className="normal-case tracking-normal text-sm font-medium">API Key</Label>
                      <Input
                        id="evolutionApiKey"
                        name="evolutionApiKey"
                        type="password"
                        placeholder={cfg?.evolutionApiKey ? "•••••••• (salva)" : "Chave da Evolution API"}
                      />
                      {cfg?.evolutionApiKey && (
                        <div className="text-xs text-muted-foreground">Chave salva.</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="evolutionInstance" className="normal-case tracking-normal text-sm font-medium">Nome da instância</Label>
                      <Input
                        id="evolutionInstance"
                        name="evolutionInstance"
                        placeholder="bfx"
                        defaultValue={cfg?.evolutionInstance ?? "bfx"}
                      />
                      <div className="text-xs text-muted-foreground">
                        Nome da instância criada na Evolution API (ex.: bfx).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="whatsappAutoEnabled"
                        name="whatsappAutoEnabled"
                        defaultChecked={cfg?.whatsappAutoEnabled !== 0}
                      />
                      <Label htmlFor="whatsappAutoEnabled" className="normal-case tracking-normal text-sm font-medium leading-normal text-foreground">
                        Envios automáticos ativados (master)
                      </Label>
                    </div>
                    <div className="space-y-3 rounded-interno bg-poco p-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        O que enviar automaticamente
                      </p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoRecibo"
                            name="whatsappAutoRecibo"
                            defaultChecked={cfg?.whatsappAutoRecibo !== 0}
                          />
                          <Label htmlFor="whatsappAutoRecibo" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Recibo ou link de assinatura após venda
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoBoleto"
                            name="whatsappAutoBoleto"
                            defaultChecked={cfg?.whatsappAutoBoleto !== 0}
                          />
                          <Label htmlFor="whatsappAutoBoleto" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Link do boleto ao gerar (manual ou venda)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoLembrete"
                            name="whatsappAutoLembrete"
                            defaultChecked={cfg?.whatsappAutoLembrete !== 0}
                          />
                          <Label htmlFor="whatsappAutoLembrete" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Lembrete de parcelas (boleto, 1–2 dias antes)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoInadimplencia"
                            name="whatsappAutoInadimplencia"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoInadimplencia === 1}
                          />
                          <Label htmlFor="whatsappAutoInadimplencia" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Parcela vencida (lembrete inadimplência)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoReativacao"
                            name="whatsappAutoReativacao"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoReativacao === 1}
                          />
                          <Label htmlFor="whatsappAutoReativacao" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Reativação clientes inativos
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            inputSize="sm"
                            id="whatsappDiasInativo"
                            name="whatsappDiasInativo"
                            min={30}
                            max={365}
                            defaultValue={String(Number((cfg as Record<string, unknown>)?.whatsappDiasInativo) || 60)}
                            className="w-16"
                          />
                          <Label htmlFor="whatsappDiasInativo" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            dias sem compra para reativação
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoAniversario"
                            name="whatsappAutoAniversario"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoAniversario === 1}
                          />
                          <Label htmlFor="whatsappAutoAniversario" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Parabéns no aniversário
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoBoasVindas"
                            name="whatsappAutoBoasVindas"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoBoasVindas === 1}
                          />
                          <Label htmlFor="whatsappAutoBoasVindas" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Boas-vindas cliente novo
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoAgradecimento"
                            name="whatsappAutoAgradecimento"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoAgradecimento === 1}
                          />
                          <Label htmlFor="whatsappAutoAgradecimento" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Agradecimento pós-venda (1 dia depois)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="whatsappAutoNPS"
                            name="whatsappAutoNPS"
                            defaultChecked={(cfg as Record<string, unknown>)?.whatsappAutoNPS === 1}
                          />
                          <Label htmlFor="whatsappAutoNPS" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                            Pesquisa satisfação (7 dias após compra)
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 rounded-interno bg-poco p-4">
                      <div className="flex items-center gap-2">
                        <FormSelect
                          id="whatsappPreAtendimento"
                          name="whatsappPreAtendimento"
                          defaultValue={String((cfg as Record<string, unknown>)?.whatsappPreAtendimento || 0)}
                          options={[
                            { value: "0", label: "Desligado" },
                            { value: "2", label: "Gratuito — respostas por regras" },
                            { value: "1", label: "IA externa — pode gerar custo" },
                          ]}
                          searchable={false}
                          className="min-w-64"
                        />
                        <Label htmlFor="whatsappPreAtendimento" className="normal-case tracking-normal text-sm font-medium leading-normal text-foreground">
                          Respostas automáticas
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <Input
                          type="number"
                          inputSize="sm"
                          id="whatsappTakeoverMinutos"
                          name="whatsappTakeoverMinutos"
                          min={5}
                          max={480}
                          defaultValue={String(Number((cfg as Record<string, unknown>)?.whatsappTakeoverMinutos) || 60)}
                          className="w-16"
                        />
                        <Label htmlFor="whatsappTakeoverMinutos" className="normal-case tracking-normal text-sm font-normal leading-normal text-foreground">
                          minutos de pausa após atendente assumir (padrão: 60)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        O modo gratuito orienta sobre orçamento, pedido e pagamento, sem consultar IA paga.
                        Não confirma preços ou quitação. ATENDENTE ou resposta humana pausa o automático.
                        No modo Meta, use o webhook oficial abaixo:
                      </p>
                      <div className="pl-6 flex flex-wrap items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                          {(() => {
                            const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://seu-dominio.com";
                            return `${base}/api/webhooks/${cfg?.whatsappProvider === 'meta_cloud' ? 'meta-whatsapp' : 'evolution'}`;
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
                    <SettingsSaveButton />
                  </form>
                </CardContent>
              </Card>
              </div>
            ),
          },
          {
            value: "email",
            label: "E-mail",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>E-mail do financeiro</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Recebe os alertas de obrigações da Prudent que vão por e-mail. Sem ele, os alertas ficam só nas
                    notificações dos administradores.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={saveEmailFinanceiro} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="emailFinanceiro" className="normal-case tracking-normal text-sm font-medium">E-mail</Label>
                      <Input
                        id="emailFinanceiro"
                        name="emailFinanceiro"
                        type="email"
                        autoComplete="email"
                        defaultValue={cfg?.emailFinanceiro ?? ""}
                        placeholder="financeiro@empresa.com.br"
                        aria-describedby={sp.error === "email_financeiro_invalido" ? "emailFinanceiro-erro" : undefined}
                      />
                      {sp.error === "email_financeiro_invalido" && (
                        <p id="emailFinanceiro-erro" className="text-sm text-error-text">
                          E-mail do financeiro inválido. Confira o endereço.
                        </p>
                      )}
                    </div>
                    <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "uber",
            label: "Uber",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Integração Uber Direct (cotação de frete)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Client ID e Client Secret vêm da <strong>Applications page</strong> do developer
                    dashboard da Uber (developer.uber.com). O sistema troca essas duas chaves por um
                    token de acesso sozinho (OAuth) e renova antes de vencer — diferente do token
                    estático antigo, nada expira na sua mão.
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={saveUber} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="uberEnabled"
                        name="uberEnabled"
                        defaultChecked={(cfg as Record<string, unknown>)?.uberEnabled === 1}
                      />
                      <Label htmlFor="uberEnabled" className="normal-case tracking-normal text-sm font-medium leading-normal text-foreground">
                        Integração ativada
                      </Label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="uberClientId" className="normal-case tracking-normal text-sm font-medium">Client ID</Label>
                        <Input
                          id="uberClientId"
                          name="uberClientId"
                          placeholder="Applications page do developer dashboard"
                          defaultValue={(cfg as Record<string, unknown>)?.uberClientId as string || ""}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="uberClientSecret" className="normal-case tracking-normal text-sm font-medium">Client Secret</Label>
                        <Input
                          id="uberClientSecret"
                          name="uberClientSecret"
                          type="password"
                          placeholder={
                            (cfg as Record<string, unknown>)?.uberClientSecret ? "•••••••• (salvo)" : "Client Secret"
                          }
                        />
                        {Boolean((cfg as Record<string, unknown>)?.uberClientSecret) && (
                          <div className="text-xs text-muted-foreground">Client Secret salvo.</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="uberCustomerId" className="normal-case tracking-normal text-sm font-medium">Customer ID (Direct)</Label>
                        <Input
                          id="uberCustomerId"
                          name="uberCustomerId"
                          placeholder="Customer ID do Uber Direct"
                          defaultValue={(cfg as Record<string, unknown>)?.uberCustomerId as string || ""}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="uberOrganizationId" className="normal-case tracking-normal text-sm font-medium">Organization ID (opcional)</Label>
                        <Input
                          id="uberOrganizationId"
                          name="uberOrganizationId"
                          placeholder="Só necessário para Uber for Business (Receipts)"
                          defaultValue={(cfg as Record<string, unknown>)?.uberOrganizationId as string || ""}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Endereço de coleta (loja)</p>
                        <p className="text-xs text-muted-foreground">
                          Origem usada na cotação — de onde o entregador retira o pedido.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="uberPickupStreet" className="normal-case tracking-normal text-sm font-medium">Endereço</Label>
                        <Input
                          id="uberPickupStreet"
                          name="uberPickupStreet"
                          placeholder="Rua Exemplo, 123"
                          defaultValue={uberPickup.street}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label htmlFor="uberPickupCity" className="normal-case tracking-normal text-sm font-medium">Cidade</Label>
                          <Input id="uberPickupCity" name="uberPickupCity" defaultValue={uberPickup.city} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="uberPickupState" className="normal-case tracking-normal text-sm font-medium">Estado (UF)</Label>
                          <Input
                            id="uberPickupState"
                            name="uberPickupState"
                            maxLength={2}
                            defaultValue={uberPickup.state}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="uberPickupZip" className="normal-case tracking-normal text-sm font-medium">CEP</Label>
                          <Input id="uberPickupZip" name="uberPickupZip" defaultValue={uberPickup.zip} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="uberPickupCountry" className="normal-case tracking-normal text-sm font-medium">País</Label>
                          <Input
                            id="uberPickupCountry"
                            name="uberPickupCountry"
                            defaultValue={uberPickup.country}
                          />
                        </div>
                      </div>
                    </div>

                    <button className={cn(buttonVariants(), "cursor-pointer")}>Salvar</button>
                  </form>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
