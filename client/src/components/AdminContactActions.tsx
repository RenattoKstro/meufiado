import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Mail, MessageCircle, Phone, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ManagedUser = {
  profile: { id: number; fullName: string; email?: string | null; phone?: string | null; instagram?: string | null; userId?: number | null };
  account?: { id: number } | null;
};

export default function AdminContactActions({ users, onChanged }: { users: ManagedUser[]; onChanged: () => Promise<void> }) {
  const deleteUser = trpc.admin.deleteUser.useMutation();
  const [, navigate] = useLocation();
  async function remove(profileId: number) {
    try { await deleteUser.mutateAsync({ profileId }); await onChanged(); toast.success("Conta excluída com sucesso."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir esta conta."); }
  }
  return <Card className="mt-7 rounded-[1.6rem] border-border/70 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-primary" />Perfis e contatos</CardTitle><CardDescription>Clique em um perfil para consultar seus contatos ou iniciar uma conversa privada.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{users.map(item => <Dialog key={item.profile.id}><DialogTrigger asChild><button className="rounded-2xl border border-border/70 bg-muted/25 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"><p className="font-extrabold">{item.profile.fullName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.profile.email || "Sem e-mail informado"}</p></button></DialogTrigger><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{item.profile.fullName}</DialogTitle><DialogDescription>Informações de contato disponíveis deste perfil.</DialogDescription></DialogHeader><div className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{item.profile.email || "E-mail não informado"}</p><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{item.profile.phone || "Telefone não informado"}</p><p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" />{item.profile.instagram ? `@${item.profile.instagram.replace(/^@/, "")}` : "Instagram não informado"}</p></div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={!item.profile.userId} onClick={() => navigate(`/chat?perfil=${item.profile.userId}`)}><MessageCircle className="mr-2 h-4 w-4" />Mensagem privada</Button><Button variant="destructive" disabled={deleteUser.isPending} onClick={() => { if (window.confirm(`Excluir permanentemente a conta de ${item.profile.fullName}? Esta ação não pode ser desfeita.`)) void remove(item.profile.id); }}><Trash2 className="mr-2 h-4 w-4" />Excluir conta</Button></div></DialogContent></Dialog>)}</CardContent></Card>;
}
