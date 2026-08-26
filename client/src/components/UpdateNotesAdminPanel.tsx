import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FilePenLine, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type UpdateNoteDraft = {
  title: string;
  description: string;
  category: string;
  isVisible: boolean;
};

const emptyDraft: UpdateNoteDraft = { title: "", description: "", category: "Geral", isVisible: true };

export default function UpdateNotesAdminPanel() {
  const utils = trpc.useUtils();
  const notesQuery = trpc.updatesAdmin.list.useQuery();
  const createMutation = trpc.updatesAdmin.create.useMutation();
  const updateMutation = trpc.updatesAdmin.update.useMutation();
  const deleteMutation = trpc.updatesAdmin.delete.useMutation();
  const [draft, setDraft] = useState<UpdateNoteDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  async function refresh() {
    await Promise.all([
      utils.updatesAdmin.list.invalidate(),
      utils.updates.list.invalidate(),
      utils.updates.unreadCount.invalidate(),
    ]);
  }

  function resetForm() {
    setDraft(emptyDraft);
    setEditingId(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (editingId) await updateMutation.mutateAsync({ id: editingId, ...draft });
      else await createMutation.mutateAsync(draft);
      await refresh();
      toast.success(editingId ? "Atualização alterada." : "Atualização publicada.");
      resetForm();
    } catch {
      toast.error("Não foi possível salvar a atualização.");
    }
  }

  function edit(note: NonNullable<typeof notesQuery.data>[number]) {
    setEditingId(note.id);
    setDraft({ title: note.title, description: note.description, category: note.category, isVisible: note.isVisible });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: number) {
    if (!window.confirm("Excluir esta nota de atualização? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      await refresh();
      if (editingId === id) resetForm();
      toast.success("Atualização excluída.");
    } catch {
      toast.error("Não foi possível excluir a atualização.");
    }
  }

  const notes = notesQuery.data ?? [];
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
    <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary"><FilePenLine className="h-4 w-4" /><CardTitle className="text-lg">{editingId ? "Editar atualização" : "Nova atualização"}</CardTitle></div>
        <CardDescription>Publique melhorias e avisos que todos poderão consultar abaixo de Ajuda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-2"><Label htmlFor="update-title">Título</Label><Input id="update-title" value={draft.title} maxLength={180} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="Ex.: Novo formato do Aciona One" required /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="update-category">Categoria</Label><Input id="update-category" value={draft.category} maxLength={80} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} placeholder="Ex.: Utilidades" required /></div><div className="flex items-end gap-3 pb-2"><Switch id="update-visible" checked={draft.isVisible} onCheckedChange={checked => setDraft(current => ({ ...current, isVisible: checked }))} /><Label htmlFor="update-visible">Publicar para todos</Label></div></div>
          <div className="space-y-2"><Label htmlFor="update-description">Descrição</Label><Textarea id="update-description" value={draft.description} maxLength={10_000} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} className="min-h-32 resize-y" placeholder="Descreva o que mudou e como usar a novidade." required /></div>
          <div className="flex flex-wrap gap-2"><Button type="submit" className="rounded-xl" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingId ? "Salvar alterações" : "Publicar atualização"}</Button>{editingId && <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>Cancelar edição</Button>}</div>
        </form>
      </CardContent>
    </Card>

    <Card className="overflow-hidden rounded-[1.6rem] border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70"><CardTitle className="text-lg">Histórico publicado</CardTitle><CardDescription>Edite a nota para corrigir o texto ou desligue a publicação sem excluí-la.</CardDescription></CardHeader>
      <CardContent className="p-0">
        {notesQuery.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando atualizações…</div> : notes.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhuma atualização cadastrada.</div> : <div className="divide-y divide-border/70">{notes.map(note => <div key={note.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{note.title}</p><Badge variant="secondary" className="rounded-full">{note.category}</Badge>{!note.isVisible && <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-700">Oculta</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" aria-label={`Editar ${note.title}`} onClick={() => edit(note)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" aria-label={`Excluir ${note.title}`} disabled={deleteMutation.isPending} onClick={() => void remove(note.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{note.description}</p></div>)}</div>}
      </CardContent>
    </Card>
  </div>;
}
