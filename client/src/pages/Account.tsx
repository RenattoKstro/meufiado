import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Camera, Headset, Loader2, Save, UserRound } from "lucide-react";
import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AccountForm = { fullName: string; phone: string; instagram: string };

function initials(value: string) {
  return value.split(" ").filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "OP";
}

export default function Account() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.mine.useQuery();
  const saveAccount = trpc.profile.account.useMutation();
  const uploadAvatar = trpc.profile.uploadAvatar.useMutation();
  const supportAvailabilityQuery = trpc.chat.mySupportAvailability.useQuery(undefined, { enabled: user?.role === "admin" });
  const setSupportAvailability = trpc.chat.setSupportAvailability.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.chat.mySupportAvailability.invalidate(), utils.chat.supportRecipient.invalidate()]);
      toast.success("Status de atendimento atualizado.");
    },
    onError: error => toast.error(error.message || "Não foi possível atualizar o status de atendimento."),
  });
  const pickerRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AccountForm>({ fullName: "", phone: "", instagram: "" });
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    setForm({ fullName: profile?.fullName ?? user?.name ?? "", phone: profile?.phone ?? "", instagram: profile?.instagram ?? "" });
    setPreview(profile?.avatarUrl ?? null);
  }, [profileQuery.data?.profile, user?.name]);

  async function refreshAccount() {
    await Promise.all([utils.profile.mine.invalidate(), utils.auth.me.invalidate()]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await saveAccount.mutateAsync({ fullName: form.fullName.trim(), phone: form.phone.trim(), instagram: form.instagram.trim() || null });
      await refreshAccount();
      toast.success("Dados da conta atualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar seus dados.");
    }
  }

  function choosePhoto() { pickerRef.current?.click(); }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      setPreview(dataUrl);
      try {
        const result = await uploadAvatar.mutateAsync({ dataUrl });
        setPreview(result.avatarUrl);
        await refreshAccount();
        toast.success("Foto de perfil atualizada.");
      } catch (error) {
        setPreview(profileQuery.data?.profile?.avatarUrl ?? null);
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
      }
    };
    reader.readAsDataURL(file);
  }

  if (profileQuery.isLoading) return <div className="mx-auto max-w-4xl"><div className="h-9 w-52 animate-pulse rounded-lg bg-muted" /><div className="mt-7 h-80 animate-pulse rounded-[1.6rem] bg-muted" /></div>;

  return <section className="mx-auto max-w-4xl">
    <header className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Perfil pessoal</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Conta</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Mantenha seus dados de contato atualizados para facilitar a comunicação entre as filiais.</p></header>
    <div className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
      <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-primary" />Foto de perfil</CardTitle><CardDescription>JPG, PNG ou WEBP, com até 2 MB.</CardDescription></CardHeader><CardContent className="flex flex-col items-center text-center"><Avatar className="h-28 w-28 border-4 border-primary/15 shadow-lg shadow-primary/10"><AvatarImage src={preview ?? undefined} alt={`Foto de ${form.fullName || "perfil"}`} /><AvatarFallback className="bg-primary/10 text-2xl font-black text-primary">{initials(form.fullName || user?.name || "")}</AvatarFallback></Avatar><input ref={pickerRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} /><Button type="button" variant="outline" onClick={choosePhoto} disabled={uploadAvatar.isPending} className="mt-5 rounded-xl font-extrabold">{uploadAvatar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}{preview ? "Trocar foto" : "Adicionar foto"}</Button></CardContent></Card>
      <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="text-lg">Dados de contato</CardTitle><CardDescription>Essas informações podem aparecer quando outros operadores abrirem seu perfil em Filiais.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label htmlFor="account-name">Nome</Label><Input id="account-name" value={form.fullName} onChange={event => setForm(current => ({ ...current, fullName: event.target.value }))} minLength={2} required /></div><div className="space-y-2"><Label htmlFor="account-phone">Telefone / WhatsApp</Label><Input id="account-phone" inputMode="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} minLength={8} required /></div><div className="space-y-2"><Label htmlFor="account-instagram">Instagram <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="account-instagram" value={form.instagram} onChange={event => setForm(current => ({ ...current, instagram: event.target.value }))} placeholder="@seuinstagram" maxLength={120} /></div><div className="rounded-xl bg-muted/55 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">E-mail de acesso</p><p className="mt-1 truncate text-sm font-bold">{profileQuery.data?.profile?.email ?? user?.email ?? "Não informado"}</p></div><div className="flex justify-end"><Button type="submit" className="h-11 rounded-xl px-6 font-extrabold" disabled={saveAccount.isPending}>{saveAccount.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar dados</Button></div></form></CardContent></Card>
    </div>
    {user?.role === "admin" && <Card className="mt-5 rounded-[1.6rem] border-primary/20 bg-primary/[0.035] shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Headset className="h-5 w-5 text-primary" />Status do atendimento</CardTitle><CardDescription>Este status aparece para os operadores no botão de atendimento da Ajuda. A presença automática continua sendo usada somente quando você estiver disponível.</CardDescription></CardHeader><CardContent><div className="max-w-md space-y-2"><Label htmlFor="support-availability">Minha disponibilidade</Label><Select value={supportAvailabilityQuery.data?.supportAvailability ?? "available"} onValueChange={value => setSupportAvailability.mutate(value as "available" | "away" | "busy")} disabled={supportAvailabilityQuery.isLoading || setSupportAvailability.isPending}><SelectTrigger id="support-availability" className="h-11 rounded-xl"><SelectValue placeholder="Escolha seu status" /></SelectTrigger><SelectContent><SelectItem value="available">Disponível</SelectItem><SelectItem value="away">Ausente</SelectItem><SelectItem value="busy">Em atendimento</SelectItem></SelectContent></Select></div></CardContent></Card>}
  </section>;
}
