import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import React from "react";

export default function Updates() {
  const utils = trpc.useUtils();
  const notesQuery = trpc.updates.list.useQuery();
  const markRead = trpc.updates.markRead.useMutation({ onSuccess: () => void utils.updates.unreadCount.invalidate() });
  const latestId = notesQuery.data?.[0]?.id;

  React.useEffect(() => {
    if (latestId && !markRead.isPending) markRead.mutate();
  // A abertura da página confirma a leitura de todas as notas públicas atuais.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId]);

  const notes = notesQuery.data ?? [];
  return <div className="mx-auto max-w-4xl">
    <div className="mb-8 rounded-[1.8rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="h-5 w-5" /></span>
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-primary">Acompanhe as novidades</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground">Atualizações</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Veja melhorias, recursos e ajustes já publicados no Meu Fiado. Este histórico é visível para todos os usuários.</p></div>
      </div>
    </div>

    <section aria-label="Histórico de atualizações" className="space-y-4">
      {notesQuery.isLoading ? <Card className="rounded-2xl border-border/80 shadow-sm"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando atualizações…</CardContent></Card> : notes.length === 0 ? <Card className="rounded-2xl border-border/80 shadow-sm"><CardContent className="p-6 text-sm text-muted-foreground">Ainda não há atualizações publicadas.</CardContent></Card> : notes.map((note, index) => <Card key={note.id} className="overflow-hidden rounded-2xl border-border/80 shadow-sm"><CardContent className="flex gap-4 p-5 sm:p-6"><div className="relative flex flex-col items-center"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CheckCircle2 className="h-4 w-4" /></span>{index < notes.length - 1 && <span className="absolute top-12 h-[calc(100%+1rem)] w-px bg-border" />}</div><div className="min-w-0 flex-1 pb-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold">{note.category}</Badge><span className="text-xs font-medium text-muted-foreground">{new Date(note.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span></div><h2 className="mt-3 text-base font-extrabold tracking-tight text-foreground sm:text-lg">{note.title}</h2><p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{note.description}</p></div></CardContent></Card>)}
    </section>
  </div>;
}
