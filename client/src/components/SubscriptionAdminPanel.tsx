import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Crown, Eye, ImagePlus, Loader2, Save, XCircle } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PageKey = "branches" | "history" | "utilities" | "chat";
type SettingsForm = {
  monthlyPrice: string;
  pixKey: string;
  pixCopyPaste: string;
  pixReceiverName: string;
  pixReceiverBank: string;
  branchesPlan: "free" | "pro";
  historyPlan: "free" | "pro";
  utilitiesPlan: "free" | "pro";
  chatPlan: "free" | "pro";
};

const pageLabels: Record<PageKey, string> = { branches: "Filiais", history: "Históricos", utilities: "Utilidades", chat: "Chat" };
const initialForm: SettingsForm = { monthlyPrice: "", pixKey: "", pixCopyPaste: "", pixReceiverName: "MEU FIADO", pixReceiverBank: "", branchesPlan: "pro", historyPlan: "pro", utilitiesPlan: "pro", chatPlan: "pro" };

export default function SubscriptionAdminPanel({ users, onChanged }: { users: Array<{ profile: { userId: number | null; fullName: string }; account: { id: number; email: string | null; plan: "free" | "pro"; proExpiresAt: Date | null; role: "admin" | "user" } | null }>; onChanged: () => Promise<void> }) {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.subscriptionAdmin.settings.useQuery();
  const proofsQuery = trpc.subscriptionAdmin.proofs.useQuery();
  const saveSettings = trpc.subscriptionAdmin.updateSettings.useMutation();
  const uploadQrCode = trpc.subscriptionAdmin.uploadPixQrCode.useMutation();
  const setPlan = trpc.subscriptionAdmin.setUserPlan.useMutation();
  const reviewProof = trpc.subscriptionAdmin.reviewProof.useMutation();
  const qrPickerRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [proofPreview, setProofPreview] = useState<{ url: string; operator: string } | null>(null);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setForm({ monthlyPrice: String(settings.monthlyPrice), pixKey: settings.pixKey, pixCopyPaste: settings.pixCopyPaste, pixReceiverName: settings.pixReceiverName, pixReceiverBank: settings.pixReceiverBank, branchesPlan: settings.branchesPlan, historyPlan: settings.historyPlan, utilitiesPlan: settings.utilitiesPlan, chatPlan: settings.chatPlan });
  }, [settingsQuery.data]);

  async function saveConfiguration() {
    const monthlyPrice = Number(form.monthlyPrice.replace(",", "."));
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) { toast.error("Informe um valor mensal válido."); return; }
    try {
      await saveSettings.mutateAsync({ monthlyPrice, pixKey: form.pixKey.trim(), pixCopyPaste: form.pixCopyPaste.trim(), pixReceiverName: form.pixReceiverName.trim(), pixReceiverBank: form.pixReceiverBank.trim(), branchesPlan: form.branchesPlan, historyPlan: form.historyPlan, utilitiesPlan: form.utilitiesPlan, chatPlan: form.chatPlan });
      await utils.subscriptionAdmin.settings.invalidate();
      toast.success("Configuração de assinatura salva.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar a configuração."); }
  }

  function uploadPaymentQr(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error("Envie o QR Code em JPG, PNG ou WEBP."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem do QR Code deve ter no máximo 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await uploadQrCode.mutateAsync({ dataUrl: String(reader.result || "") });
        await utils.subscriptionAdmin.settings.invalidate();
        toast.success("Imagem do QR Code atualizada.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar o QR Code."); }
    };
    reader.readAsDataURL(file);
  }

  async function changePlan(userId: number, plan: "free" | "pro") {
    try { await setPlan.mutateAsync({ userId, plan }); await Promise.all([onChanged(), utils.subscriptionAdmin.proofs.invalidate()]); toast.success(plan === "pro" ? "Usuário liberado como PRO por 30 dias, com cinco dias de carência após o vencimento." : "Usuário movido para o plano Free."); }
    catch { toast.error("Não foi possível atualizar o plano do usuário."); }
  }

  async function review(id: number, status: "approved" | "rejected") {
    try {
      await reviewProof.mutateAsync({ id, status });
      await Promise.all([proofsQuery.refetch(), onChanged()]);
      toast.success(status === "approved" ? "Comprovante aprovado e PRO liberado por 30 dias, com cinco dias de carência após o vencimento." : "Comprovante recusado.");
    } catch { toast.error("Não foi possível concluir a análise."); }
  }

  const operators = users.filter(item => item.account && item.account.role !== "admin") as Array<{ profile: { userId: number | null; fullName: string }; account: { id: number; email: string | null; plan: "free" | "pro"; proExpiresAt: Date | null; role: "admin" | "user" } }>;
  const qrCodeUrl = settingsQuery.data?.pixQrCodeUrl;

  return <div className="grid gap-5">
    <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Crown className="h-5 w-5 text-primary" />Mensalidade e páginas por plano</CardTitle><CardDescription>Novas contas começam no Free. Ative o controle de cada página para torná-la exclusiva do PRO; desative-o para liberá-la no Free.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="subscription-price">Mensalidade (R$)</Label><Input id="subscription-price" type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={event => setForm(current => ({ ...current, monthlyPrice: event.target.value }))} placeholder="Ex.: 19.90" /></div>
          <div className="space-y-2"><Label htmlFor="subscription-receiver">Nome do recebedor</Label><Input id="subscription-receiver" maxLength={25} value={form.pixReceiverName} onChange={event => setForm(current => ({ ...current, pixReceiverName: event.target.value }))} placeholder="Ex.: MEU FIADO" /></div>
          <div className="space-y-2"><Label htmlFor="subscription-pix">Chave PIX (opcional)</Label><Input id="subscription-pix" value={form.pixKey} onChange={event => setForm(current => ({ ...current, pixKey: event.target.value }))} placeholder="CPF, e-mail, telefone ou chave aleatória" /></div>
          <div className="space-y-2"><Label htmlFor="subscription-bank">Nome do banco (opcional)</Label><Input id="subscription-bank" maxLength={80} value={form.pixReceiverBank} onChange={event => setForm(current => ({ ...current, pixReceiverBank: event.target.value }))} placeholder="Ex.: Banco do Brasil" /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="subscription-copy-paste">PIX Copia e Cola</Label><Textarea id="subscription-copy-paste" value={form.pixCopyPaste} maxLength={2048} onChange={event => setForm(current => ({ ...current, pixCopyPaste: event.target.value }))} placeholder="Cole aqui o código PIX Copia e Cola fornecido pela sua instituição." className="min-h-28 font-mono text-xs" /></div>
        <div className="rounded-2xl border border-dashed border-border bg-muted/25 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code PIX configurado" className="h-16 w-16 rounded-lg border bg-white object-contain p-1" /> : <span className="grid h-16 w-16 place-items-center rounded-lg bg-muted text-muted-foreground"><ImagePlus className="h-6 w-6" /></span>}<div><p className="text-sm font-extrabold">Imagem do QR Code PIX</p><p className="mt-1 text-xs text-muted-foreground">Envie a imagem oficial fornecida pela instituição recebedora. JPG, PNG ou WEBP de até 2 MB.</p></div></div><input ref={qrPickerRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPaymentQr} /><Button type="button" variant="outline" className="rounded-xl" disabled={uploadQrCode.isPending} onClick={() => qrPickerRef.current?.click()}>{uploadQrCode.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{qrCodeUrl ? "Trocar imagem" : "Anexar QR Code"}</Button></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(Object.keys(pageLabels) as PageKey[]).map(key => { const settingKey = `${key}Plan` as const; const isProOnly = form[settingKey] === "pro"; return <div key={key} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/25 px-3 py-3"><div><p className="text-sm font-extrabold">{pageLabels[key]}</p><p className="text-[11px] text-muted-foreground">{isProOnly ? "Exclusiva PRO" : "Liberada no Free"}</p></div><div className="flex items-center gap-2"><Switch checked={isProOnly} onCheckedChange={checked => setForm(current => ({ ...current, [settingKey]: checked ? "pro" : "free" }))} aria-label={`${pageLabels[key]} exclusiva para PRO`} /><span className="text-[10px] font-bold text-muted-foreground">PRO</span></div></div>; })}</div>
        <div className="flex justify-end"><Button onClick={saveConfiguration} disabled={saveSettings.isPending} className="rounded-xl font-extrabold">{saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar configuração</Button></div>
      </CardContent>
    </Card>

    <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Usuários PRO</CardTitle><CardDescription>Altere manualmente o plano de cada operador. Ao liberar PRO, o prazo é de 30 dias a partir de agora, seguido de cinco dias de carência.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{operators.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Ainda não há operadores disponíveis para gerenciamento de plano.</p> : operators.map(item => { const expiration = item.account.proExpiresAt ? new Date(item.account.proExpiresAt) : null; const isPro = item.account.plan === "pro" && (!expiration || expiration.getTime() + 5 * 24 * 60 * 60 * 1000 >= Date.now()); const isGracePeriod = Boolean(isPro && expiration && expiration.getTime() < Date.now()); return <div key={item.account.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-extrabold">{item.profile.fullName}</p><Badge className={isGracePeriod ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400" : isPro ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-muted text-muted-foreground hover:bg-muted"}>{isGracePeriod ? "CARÊNCIA" : isPro ? "PRO" : "FREE"}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{item.account.email || "E-mail não informado"}{expiration ? isGracePeriod ? ` · renovar até ${new Date(expiration.getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}` : ` · válido até ${expiration.toLocaleDateString("pt-BR")}` : ""}</p></div><div className="flex items-center gap-2"><Switch checked={isPro} disabled={setPlan.isPending} onCheckedChange={checked => changePlan(item.account.id, checked ? "pro" : "free")} aria-label={`Plano PRO para ${item.profile.fullName}`} /><span className="text-xs font-bold">Plano PRO</span></div></div>; })}</div></CardContent></Card>

    <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Comprovantes enviados</CardTitle><CardDescription>Após o pagamento o admin será notificado e irá liberar o acesso após analisar o comprovante.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{proofsQuery.isLoading ? <p className="p-5 text-sm text-muted-foreground">Carregando comprovantes…</p> : (proofsQuery.data || []).length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nenhum comprovante foi enviado.</p> : (proofsQuery.data || []).map(item => { const operator = item.profile?.fullName || item.account.name || "Operador"; return <div key={item.proof.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">{operator}</p><ProofBadge status={item.proof.status} /></div><p className="mt-1 text-xs text-muted-foreground">Enviado em {new Date(item.proof.createdAt).toLocaleString("pt-BR")}{item.proof.reviewNote ? ` · ${item.proof.reviewNote}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="rounded-lg" onClick={() => setProofPreview({ url: item.proof.proofUrl, operator })}><Eye className="mr-2 h-3.5 w-3.5" />Visualizar</Button>{item.proof.status === "pending" && <><Button size="sm" className="rounded-lg" disabled={reviewProof.isPending} onClick={() => review(item.proof.id, "approved")}><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Aprovar</Button><Button size="sm" variant="outline" className="rounded-lg border-destructive/30 text-destructive hover:text-destructive" disabled={reviewProof.isPending} onClick={() => review(item.proof.id, "rejected")}><XCircle className="mr-2 h-3.5 w-3.5" />Recusar</Button></>}</div></div>; })}</div></CardContent></Card>

    <Dialog open={Boolean(proofPreview)} onOpenChange={open => { if (!open) setProofPreview(null); }}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.6rem] sm:max-w-3xl"><DialogHeader><DialogTitle>Comprovante de {proofPreview?.operator}</DialogTitle><DialogDescription>Confira o comprovante sem sair da Administração antes de decidir sobre a liberação.</DialogDescription></DialogHeader>{proofPreview && <img src={proofPreview.url} alt={`Comprovante enviado por ${proofPreview.operator}`} className="mx-auto max-h-[68vh] rounded-xl border bg-muted object-contain" />}</DialogContent></Dialog>
  </div>;
}

function ProofBadge({ status }: { status: "pending" | "approved" | "rejected" }) { const labels = { pending: "Em análise", approved: "Aprovado", rejected: "Recusado" }; const styles = { pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400", approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", rejected: "bg-destructive/10 text-destructive" }; return <Badge className={styles[status]}>{labels[status]}</Badge>; }
