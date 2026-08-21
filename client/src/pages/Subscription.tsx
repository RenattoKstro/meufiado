import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { createPixPayload } from "@shared/pix";
import { CheckCircle2, Clipboard, Crown, FileImage, Loader2, QrCode, ShieldCheck, UploadCloud } from "lucide-react";
import QRCode from "qrcode";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Subscription() {
  const utils = trpc.useUtils();
  const subscriptionQuery = trpc.subscription.mine.useQuery();
  const submitProof = trpc.subscription.submitProof.useMutation();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const subscription = subscriptionQuery.data;
  const pixPayload = useMemo(() => {
    const settings = subscription?.settings;
    if (!settings?.pixKey || settings.monthlyPrice <= 0) return null;
    try {
      return createPixPayload({ key: settings.pixKey, amount: settings.monthlyPrice, receiverName: settings.pixReceiverName, receiverCity: settings.pixReceiverCity });
    } catch { return null; }
  }, [subscription?.settings.monthlyPrice, subscription?.settings.pixKey, subscription?.settings.pixReceiverCity, subscription?.settings.pixReceiverName]);

  useEffect(() => {
    let active = true;
    if (!pixPayload) {
      setQrDataUrl(null);
      return () => { active = false; };
    }
    QRCode.toDataURL(pixPayload, { width: 260, margin: 1, errorCorrectionLevel: "M", color: { dark: "#101828", light: "#FFFFFF" } })
      .then(url => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(null); });
    return () => { active = false; };
  }, [pixPayload]);

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch { toast.error("Não foi possível copiar agora."); }
  }

  async function handleProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Envie o comprovante em JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("O comprovante deve ter no máximo 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await submitProof.mutateAsync({ dataUrl: String(reader.result || "") });
        await utils.subscription.mine.invalidate();
        toast.success("Comprovante enviado para análise.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
      }
    };
    reader.readAsDataURL(file);
  }

  if (subscriptionQuery.isLoading) return <section className="mx-auto max-w-4xl"><div className="h-9 w-52 animate-pulse rounded-lg bg-muted" /><div className="mt-7 h-80 animate-pulse rounded-[1.6rem] bg-muted" /></section>;
  if (subscriptionQuery.isError || !subscription) return <section className="mx-auto max-w-3xl"><Card className="rounded-[1.6rem]"><CardContent className="p-7 text-sm text-muted-foreground">Não foi possível carregar sua assinatura agora. Atualize a página e tente novamente.</CardContent></Card></section>;

  const { settings, latestProof, isPro, proExpiresAt } = subscription;
  const paymentReady = Boolean(settings.pixKey && settings.monthlyPrice > 0);
  const waitingReview = latestProof?.status === "pending";

  return <section className="mx-auto max-w-4xl">
    <header className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Acesso da conta</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Plano Meu Fiado</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Gerencie sua assinatura e libere os recursos definidos como PRO pela administração.</p></header>
    <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
      <Card className={`rounded-[1.6rem] border-border/70 shadow-sm ${isPro ? "bg-primary/[0.03]" : ""}`}>
        <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Crown className="h-5 w-5 text-primary" />{isPro ? "Você é PRO" : "Plano Free"}</CardTitle><CardDescription className="mt-1">{isPro ? "Seu acesso premium está ativo." : "Sua conta começa com os recursos liberados para o plano Free."}</CardDescription></div>{isPro ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">ATIVO</span> : <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-extrabold text-muted-foreground">FREE</span>}</div></CardHeader>
        <CardContent className="space-y-4"><div className="rounded-2xl bg-muted/55 p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Mensalidade PRO</p><p className="mt-1 text-2xl font-black">{settings.monthlyPrice > 0 ? money.format(settings.monthlyPrice) : "A definir"}</p><p className="mt-1 text-xs text-muted-foreground">A administração define o valor e confirma o pagamento após analisar o comprovante.</p></div>{isPro && <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />{proExpiresAt ? `Válido até ${new Date(proExpiresAt).toLocaleDateString("pt-BR")}.` : "Acesso liberado pela administração."}</p>}{latestProof && !isPro && <ProofStatus status={latestProof.status} note={latestProof.reviewNote} />}</CardContent>
      </Card>
      <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
        <CardHeader><CardTitle className="text-lg">Pagamento via PIX</CardTitle><CardDescription>Faça o pagamento, envie a imagem do comprovante e aguarde a liberação do plano PRO.</CardDescription></CardHeader>
        <CardContent className="space-y-5">{!paymentReady ? <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">A chave PIX ou o valor da mensalidade ainda não foram configurados pela administração.</div> : <>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-border bg-white p-3">{qrDataUrl ? <img src={qrDataUrl} alt={`QR Code PIX de ${money.format(settings.monthlyPrice)}`} className="h-40 w-40" /> : <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-muted text-muted-foreground"><QrCode className="h-9 w-9 animate-pulse" /></div>}</div>
            <div className="space-y-3"><div><p className="text-sm font-extrabold">Escaneie para pagar</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">O QR Code já inclui a mensalidade de {money.format(settings.monthlyPrice)}.</p></div><div className="rounded-xl bg-muted/55 p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Recebedor</p><p className="mt-1 text-sm font-extrabold">{settings.pixReceiverName}</p><p className="text-xs text-muted-foreground">{settings.pixReceiverCity}</p></div>{pixPayload && <Button type="button" variant="outline" className="w-full rounded-xl font-bold" onClick={() => copyToClipboard(pixPayload, "PIX Copia e Cola copiado.")}><Clipboard className="mr-2 h-4 w-4" />Copiar PIX Copia e Cola</Button>}</div>
          </div>
          <div className="space-y-2"><Label>Chave PIX</Label><div className="flex gap-2"><Input value={settings.pixKey} readOnly className="bg-muted/35 font-medium" /><Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={() => copyToClipboard(settings.pixKey, "Chave PIX copiada.")}><Clipboard className="mr-2 h-4 w-4" />Copiar</Button></div></div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mr-1.5 inline h-4 w-4 text-primary" />Confirme o nome e o valor no aplicativo do seu banco antes de autorizar. O comprovante é encaminhado somente à administração para conferência e aprovação.</div>
          <input ref={pickerRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProof} /><Button type="button" className="h-11 w-full rounded-xl font-extrabold" disabled={submitProof.isPending || waitingReview || isPro} onClick={() => pickerRef.current?.click()}>{submitProof.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}{isPro ? "Plano PRO ativo" : waitingReview ? "Comprovante em análise" : "Enviar comprovante"}</Button><p className="text-center text-[11px] text-muted-foreground"><FileImage className="mr-1 inline h-3.5 w-3.5" />JPG, PNG ou WEBP · até 3 MB</p>
        </>}</CardContent>
      </Card>
    </div>
  </section>;
}

function ProofStatus({ status, note }: { status: "pending" | "approved" | "rejected"; note: string | null }) {
  const content = status === "pending" ? { title: "Comprovante em análise", description: "Aguarde a confirmação da administração.", tone: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400" } : status === "rejected" ? { title: "Comprovante não aprovado", description: note || "Envie um novo comprovante ou fale com a administração.", tone: "border-destructive/25 bg-destructive/10 text-destructive" } : { title: "Comprovante aprovado", description: "Seu plano PRO será atualizado em instantes.", tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  return <div className={`rounded-xl border p-3 text-sm ${content.tone}`}><p className="font-extrabold">{content.title}</p><p className="mt-1 text-xs opacity-90">{content.description}</p></div>;
}
