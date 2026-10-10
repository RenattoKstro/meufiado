import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAppTexts } from "@/contexts/AppTextContext";
import { AlertTriangle, CheckCircle2, Clipboard, Crown, Loader2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const planInfoBackgroundClasses = {
  sky: "border-sky-500/25 bg-sky-500/[0.08]",
  emerald: "border-emerald-500/25 bg-emerald-500/[0.08]",
  violet: "border-violet-500/25 bg-violet-500/[0.08]",
  amber: "border-amber-500/25 bg-amber-500/[0.08]",
  rose: "border-rose-500/25 bg-rose-500/[0.08]",
  slate: "border-slate-500/25 bg-slate-500/[0.08]",
} as const;
type CustomPlan = { id: string; name: string; description: string; monthlyPrice: number; promotionPrice: number; isVisible: boolean };
type PixPayment = { id: number; planId: string; status: string; statusDetail: string | null; amount: number; qrCode: string | null; qrCodeBase64: string | null; ticketUrl: string | null; dateOfExpiration: Date | string | null; updatedAt: Date | string };
function readCustomPlans(value: string | null | undefined): CustomPlan[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && item.isVisible !== false && String(item.name || "").trim()).map(item => ({ id: String(item.id), name: String(item.name), description: String(item.description || ""), monthlyPrice: Number(item.monthlyPrice) || 0, promotionPrice: Number(item.promotionPrice) || 0, isVisible: true })) : [];
  } catch { return []; }
}
function qrSource(payment: PixPayment | null) {
  if (!payment?.qrCodeBase64) return null;
  return payment.qrCodeBase64.startsWith("data:") ? payment.qrCodeBase64 : `data:image/png;base64,${payment.qrCodeBase64}`;
}
function formatDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : null;
}

export default function Subscription() {
  const utils = trpc.useUtils();
  const texts = useAppTexts();
  const subscriptionQuery = trpc.subscription.mine.useQuery(undefined, { refetchInterval: 5_000, refetchIntervalInBackground: true });
  const createPixPayment = trpc.subscription.createPixPayment.useMutation();
  const subscription = subscriptionQuery.data;
  const [selectedPlanId, setSelectedPlanId] = useState("default");
  const [activePixPayment, setActivePixPayment] = useState<PixPayment | null>(null);
  const settings = subscription?.settings;
  const customPlans = readCustomPlans(settings?.customPlansJson);
  const selectedPlan = customPlans.find(plan => plan.id === selectedPlanId);
  const promotionIsActive = Boolean(settings && settings.promotionOriginalPrice > settings.promotionPrice && settings.promotionPrice > 0);
  const selectedPromotion = Boolean(selectedPlan && selectedPlan.promotionPrice > 0 && selectedPlan.promotionPrice < selectedPlan.monthlyPrice);
  const chargeAmount = selectedPlan ? (selectedPromotion ? selectedPlan.promotionPrice : selectedPlan.monthlyPrice) : (promotionIsActive && settings ? settings.promotionPrice : settings?.monthlyPrice ?? 0);
  const latestPixPayment = (subscription?.latestPixPayment ?? null) as PixPayment | null;
  const latestPaymentForSelectedPlan = latestPixPayment?.planId === selectedPlanId ? latestPixPayment : null;
  const currentPixPayment = activePixPayment?.planId === selectedPlanId ? activePixPayment : latestPaymentForSelectedPlan;

  useEffect(() => {
    if (latestPixPayment?.planId === selectedPlanId && (!activePixPayment || latestPixPayment.id === activePixPayment.id)) setActivePixPayment(latestPixPayment);
  }, [latestPixPayment?.id, latestPixPayment?.planId, latestPixPayment?.status, latestPixPayment?.updatedAt, selectedPlanId]);

  async function copyToClipboard(value: string, successMessage: string) {
    try { await navigator.clipboard.writeText(value); toast.success(successMessage); } catch { toast.error("Não foi possível copiar agora."); }
  }
  async function generatePixForPlan(planId: string) {
    try {
      const payment = await createPixPayment.mutateAsync({ planId });
      setActivePixPayment(payment as PixPayment);
      toast.success("PIX gerado para o plano escolhido.");
      await utils.subscription.mine.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PIX."); }
  }
  async function createAutomaticPix() {
    if (!(chargeAmount > 0)) { toast.error("Este plano ainda não tem preço configurado."); return; }
    await generatePixForPlan(selectedPlanId);
  }
  async function choosePlan(planId: string) {
    setSelectedPlanId(planId);
    setActivePixPayment(null);
    await generatePixForPlan(planId);
  }

  if (subscriptionQuery.isLoading) return <section className="mx-auto max-w-4xl"><div className="h-9 w-52 animate-pulse rounded-lg bg-muted" /><div className="mt-7 h-80 animate-pulse rounded-[1.6rem] bg-muted" /></section>;
  if (subscriptionQuery.isError || !subscription || !settings) return <section className="mx-auto max-w-3xl"><Card className="rounded-[1.6rem]"><CardContent className="p-7 text-sm text-muted-foreground">Não foi possível carregar sua assinatura agora. Atualize a página e tente novamente.</CardContent></Card></section>;

  const { isPro, proExpiresAt, status, graceEndsAt } = subscription;
  const isGracePeriod = status === "grace";
  const graceDaysRemaining = graceEndsAt ? Math.max(0, Math.ceil((new Date(graceEndsAt).getTime() - Date.now()) / 86_400_000)) : 0;
  const planInfoBackground = planInfoBackgroundClasses[settings.planInfoBackground as keyof typeof planInfoBackgroundClasses] ?? planInfoBackgroundClasses.sky;
  const promotionBackground = planInfoBackgroundClasses[settings.promotionBackground as keyof typeof planInfoBackgroundClasses] ?? planInfoBackgroundClasses.emerald;
  const showPlanInfoCta = settings.planInfoCtaEnabled && settings.planInfoCtaLabel.trim().length >= 2 && /^(\/|https?:\/\/)/.test(settings.planInfoCtaUrl);
  const isExternalPlanInfoCta = /^https?:\/\//.test(settings.planInfoCtaUrl);
  const planOptions: CustomPlan[] = [{ id: "default", name: "Plano PRO padrão", description: "Acesso aos recursos PRO do Meu Fiado.", monthlyPrice: settings.monthlyPrice, promotionPrice: promotionIsActive ? settings.promotionPrice : 0, isVisible: true }, ...customPlans];
  const automaticQr = qrSource(currentPixPayment);
  const automaticStatus = currentPixPayment?.status;
  const automaticPending = Boolean(currentPixPayment && ["pending", "in_process", "authorized"].includes(automaticStatus || ""));
  const automaticApproved = automaticStatus === "approved";

  return <section className="mx-auto max-w-4xl">
    <header className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Acesso da conta</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{texts.subscriptionTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{texts.subscriptionDescription}</p></header>
    {isGracePeriod && graceEndsAt ? <Card role="alert" className="mb-5 rounded-[1.6rem] border-amber-500/35 bg-amber-500/[0.08] shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-5 w-5" /></span><div><p className="font-black text-amber-900 dark:text-amber-200">Renovação necessária</p><p className="mt-1 text-sm leading-relaxed text-amber-900/75 dark:text-amber-100/75">Seu PRO está em carência. Renove em até <strong>{graceDaysRemaining} dia{graceDaysRemaining === 1 ? "" : "s"}</strong>, até {new Date(graceEndsAt).toLocaleDateString("pt-BR")}, para continuar com os recursos premium.</p></div></div><Button type="button" className="shrink-0 rounded-xl bg-amber-600 font-extrabold text-white hover:bg-amber-700" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>Renovar agora</Button></CardContent></Card> : null}
    <Card className={`mb-5 rounded-[1.6rem] shadow-sm ${planInfoBackground}`}><CardContent className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 text-primary shadow-sm"><Crown className="h-5 w-5" /></span><div><h2 className="text-lg font-black tracking-[-0.02em]">{settings.planInfoTitle}</h2><p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-foreground/70">{settings.planInfoDescription}</p>{showPlanInfoCta ? <a href={settings.planInfoCtaUrl} target={isExternalPlanInfoCta ? "_blank" : undefined} rel={isExternalPlanInfoCta ? "noreferrer" : undefined} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]">{settings.planInfoCtaLabel}</a> : null}</div></div></CardContent></Card>
    {planOptions.length > 1 && <section className="mb-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Escolha sua modalidade</p><h2 className="mt-1 text-xl font-black">Planos disponíveis</h2><p className="mt-1 text-sm text-muted-foreground">Escolha uma modalidade para gerar o QR Code do Mercado Pago sem sair desta página.</p></div><div className="grid gap-4 md:grid-cols-2">{planOptions.map(plan => { const discounted = plan.promotionPrice > 0 && plan.promotionPrice < plan.monthlyPrice; const selected = selectedPlanId === plan.id; const hasCurrentPayment = selected && Boolean(currentPixPayment); return <Card key={plan.id} className={`rounded-[1.4rem] border-border/70 shadow-sm ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}><CardContent className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{plan.name}</CardTitle><CardDescription className="mt-1">{plan.description || "Acesso aos recursos PRO."}</CardDescription></div><Crown className="h-5 w-5 shrink-0 text-primary" /></div><p className="text-2xl font-black text-primary">{money.format(discounted ? plan.promotionPrice : plan.monthlyPrice)}<span className="ml-1 text-xs font-semibold text-muted-foreground">/mês</span></p><Button type="button" variant={selected ? "default" : "outline"} className="w-full rounded-xl font-extrabold" disabled={createPixPayment.isPending || hasCurrentPayment} onClick={() => { if (!hasCurrentPayment) void choosePlan(plan.id); }}>{hasCurrentPayment ? "PIX deste plano aberto" : selected ? "Gerar QR Code deste plano" : "Escolher e gerar QR Code"}</Button></CardContent></Card>; })}</div></section>}
    <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
      <Card className={`lg:self-start rounded-[1.6rem] border-border/70 shadow-sm ${isPro ? "bg-primary/[0.03]" : ""}`}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Crown className="h-5 w-5 text-primary" />{isPro ? "Boas-vindas ao PRO" : "Plano Free"}</CardTitle><CardDescription className="mt-1">{isGracePeriod ? "Sua assinatura venceu, mas você ainda está no período de carência." : isPro ? "Seu acesso premium está ativo." : "Sua conta está no plano Free."}</CardDescription></div>{isGracePeriod ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-400">CARÊNCIA</span> : isPro ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">PRO</span> : <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-extrabold text-muted-foreground">FREE</span>}</div></CardHeader><CardContent className="space-y-4"><div className={`rounded-2xl p-4 ${promotionIsActive ? `border ${promotionBackground}` : "bg-muted/55"}`}>{promotionIsActive ? <><span className="inline-flex rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">{settings.promotionBadge}</span><p className="mt-3 text-base font-extrabold tracking-tight">{settings.promotionTitle}</p><p className="mt-1 text-xs leading-relaxed text-foreground/75">{settings.promotionDescription}</p><div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2"><span className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Preço normal</span><span className="text-sm font-bold text-muted-foreground line-through">{money.format(settings.promotionOriginalPrice)}</span></span><span className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Preço promocional</span><span className="text-2xl font-black text-primary">{money.format(chargeAmount)}</span></span></div></> : <><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Mensalidade PRO</p><p className="mt-1 text-2xl font-black">{chargeAmount > 0 ? money.format(chargeAmount) : "A definir"}</p></>}<p className="mt-2 text-xs text-muted-foreground">O pagamento aprovado pelo Mercado Pago libera o acesso automaticamente.</p></div>{isGracePeriod && graceEndsAt ? <p className="flex items-start gap-2 text-sm font-bold text-amber-700 dark:text-amber-400"><Crown className="mt-0.5 h-4 w-4 shrink-0" />Renove até {new Date(graceEndsAt).toLocaleDateString("pt-BR")}. Depois dessa data, sua conta passará para o plano Free.</p> : isPro && <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />{proExpiresAt ? `Sua assinatura é válida até ${new Date(proExpiresAt).toLocaleDateString("pt-BR")}. Após o vencimento, há cinco dias de carência.` : "Acesso liberado pela administração."}</p>}</CardContent></Card>
      <div className="space-y-5">
        <Card className="rounded-[1.6rem] border-primary/25 bg-primary/[0.03] shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><QrCode className="h-5 w-5 text-primary" />PIX automático</CardTitle><CardDescription>Gere o PIX pelo Mercado Pago. O webhook confirma o pagamento e libera ou renova seu PRO sem envio de comprovante.</CardDescription></CardHeader><CardContent className="space-y-4">{!currentPixPayment ? <><div className="rounded-2xl border border-dashed border-primary/25 bg-background/60 p-5 text-sm text-muted-foreground">Plano selecionado: <strong className="text-foreground">{money.format(chargeAmount)}</strong>. Clique para gerar uma cobrança PIX exclusiva para sua conta.</div><Button type="button" className="h-11 w-full rounded-xl font-extrabold" disabled={createPixPayment.isPending || chargeAmount <= 0} onClick={() => void createAutomaticPix()}>{createPixPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}Gerar PIX automático</Button></> : <><div className="grid gap-4 sm:grid-cols-[auto_1fr]"><div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-border bg-white p-3">{automaticQr ? <img src={automaticQr} alt={`QR Code PIX de ${money.format(currentPixPayment.amount)}`} className="h-40 w-40 object-contain" /> : <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-muted px-3 text-center text-xs text-muted-foreground">Aguardando o QR Code.</div>}</div><div className="space-y-3"><div><p className="text-sm font-extrabold">Cobrança PIX {money.format(currentPixPayment.amount)}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{automaticApproved ? "Pagamento aprovado. Atualizando seu acesso..." : automaticPending ? "Aguardando a confirmação automática do Mercado Pago." : `Status: ${currentPixPayment.statusDetail || currentPixPayment.status}.`}</p></div>{currentPixPayment.qrCode && <Button type="button" variant="outline" className="w-full rounded-xl font-bold" onClick={() => void copyToClipboard(currentPixPayment.qrCode!, "PIX Copia e Cola copiado.")}><Clipboard className="mr-2 h-4 w-4" />Copiar PIX Copia e Cola</Button>}{currentPixPayment.ticketUrl && <a href={currentPixPayment.ticketUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">Abrir cobrança</a>}</div></div>{automaticApproved ? <p className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />Pagamento reconhecido automaticamente.</p> : <p className="text-xs text-muted-foreground">{formatDate(currentPixPayment.dateOfExpiration) ? `Válido até ${formatDate(currentPixPayment.dateOfExpiration)}.` : "A cobrança fica disponível no Mercado Pago."} Esta tela consulta o status a cada 5 segundos.</p>}{!automaticPending && !automaticApproved && <Button type="button" variant="outline" className="w-full rounded-xl font-bold" onClick={() => { setActivePixPayment(null); void createAutomaticPix(); }} disabled={createPixPayment.isPending}>Gerar novo PIX</Button>}</>}</CardContent></Card>
      </div>
    </div>
  </section>;
}
