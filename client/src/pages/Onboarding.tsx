import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, CircleAlert, Loader2, UserRoundCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const branches = trpc.profile.branches.useQuery();
  const complete = trpc.profile.complete.useMutation();
  const createBranch = trpc.admin.createBranch.useMutation();
  const utils = trpc.useUtils();
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [branchId, setBranchId] = useState("");
  const [operatorType, setOperatorType] = useState<"leader" | "assistant">("leader");
  const [firstBranchName, setFirstBranchName] = useState("");
  const noBranches = !branches.isLoading && branches.data?.length === 0;

  async function addFirstBranch() {
    if (!firstBranchName.trim()) return;
    await createBranch.mutateAsync({ name: firstBranchName.trim() });
    const updated = await branches.refetch();
    const created = updated.data?.find(branch => branch.name === firstBranchName.trim());
    if (created) setBranchId(String(created.id));
    toast.success("Filial cadastrada. Agora conclua seu perfil.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!branchId) return toast.error("Selecione a filial em que você atua.");
    try {
      await complete.mutateAsync({ fullName, email: user?.email || "", branchId: Number(branchId), phone, instagram: instagram || null, operatorType });
      await utils.profile.mine.invalidate();
      toast.success("Perfil concluído. Bem-vindo ao painel!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir seu cadastro.");
    }
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_35%)] px-4 py-10 sm:px-8"><div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-2xl shadow-primary/10 lg:grid-cols-[.82fr_1.18fr]"><section className="relative overflow-hidden bg-primary p-8 text-primary-foreground sm:p-10"><div className="relative z-10"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><UserRoundCheck className="h-5 w-5" /></div><p className="mt-8 text-sm font-bold text-white/70">Primeiro acesso</p><h1 className="mt-2 text-3xl font-black tracking-tight">Vamos personalizar seu painel.</h1><p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">Essas informações definem as metas que você acompanha e ajudam o gestor a organizar cada filial.</p></div><div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full border-[40px] border-white/10" /></section><section className="p-7 sm:p-10"><h2 className="text-2xl font-black tracking-tight">Complete seu cadastro</h2><p className="mt-2 text-sm text-muted-foreground">Os campos marcados são necessários para liberar o dashboard.</p>{noBranches && <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><div className="flex gap-2 text-amber-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-extrabold">Nenhuma filial cadastrada</p><p className="mt-1 text-xs leading-relaxed">{user?.role === "admin" ? "Cadastre a primeira filial para iniciar a operação." : "Peça ao administrador para cadastrar sua filial antes de concluir o acesso."}</p></div></div>{user?.role === "admin" && <div className="mt-4 flex gap-2"><Input value={firstBranchName} onChange={event => setFirstBranchName(event.target.value)} placeholder="Ex.: Filial Centro" /><Button onClick={addFirstBranch} disabled={createBranch.isPending || !firstBranchName.trim()}>{createBranch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}<span className="sr-only">Cadastrar filial</span></Button></div>}</div>}
  <form onSubmit={submit} className="mt-7 space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Nome completo</Label><Input id="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Seu nome" required /></div><div className="space-y-2"><Label htmlFor="phone">Tel. / WhatsApp</Label><Input id="phone" value={phone} onChange={event => setPhone(event.target.value)} placeholder="(00) 00000-0000" required /></div><div className="space-y-2"><Label htmlFor="instagram">Instagram <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="instagram" value={instagram} onChange={event => setInstagram(event.target.value)} placeholder="@seuperfil" /></div><div className="space-y-2"><Label>Filial</Label><Select value={branchId} onValueChange={setBranchId} disabled={noBranches}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{branches.data?.map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Responsabilidade</Label><Select value={operatorType} onValueChange={value => setOperatorType(value as "leader" | "assistant")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Operador Líder</SelectItem><SelectItem value="assistant">Operador Auxiliar</SelectItem></SelectContent></Select></div></div><Button type="submit" size="lg" className="h-12 w-full rounded-xl font-extrabold" disabled={complete.isPending || noBranches}>{complete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar no painel</Button></form></section></div></main>;
}
