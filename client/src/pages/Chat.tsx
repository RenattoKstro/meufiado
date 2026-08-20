import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Send, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function usePrivateRecipient() {
  const [location] = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const value = Number(params.get("perfil"));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }, [location]);
}

export default function Chat() {
  const recipientUserId = usePrivateRecipient();
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const messagesQuery = recipientUserId
    ? trpc.chat.private.useQuery({ recipientUserId }, { refetchInterval: 5_000 })
    : trpc.chat.general.useQuery(undefined, { refetchInterval: 5_000 });
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: async () => {
      setBody("");
      await (recipientUserId ? utils.chat.private.invalidate({ recipientUserId }) : utils.chat.general.invalidate());
    },
    onError: () => toast.error("Não foi possível enviar a mensagem. Tente novamente."),
  });
  const title = recipientUserId ? "Conversa privada" : "Chat geral";

  return <section className="mx-auto max-w-4xl space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Comunicação</p><h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted-foreground">As mensagens são atualizadas a cada poucos segundos e desaparecem automaticamente após 1 hora.</p></div>
    <Card className="overflow-hidden rounded-[1.7rem] border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70"><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />{title}</CardTitle><CardDescription className="flex items-center gap-1"><TimerReset className="h-3.5 w-3.5" />Mensagens temporárias — expiram em 1 hora.</CardDescription></CardHeader>
      <CardContent className="space-y-3 p-5">
        <div className="min-h-[320px] space-y-3 rounded-2xl bg-muted/35 p-4">
          {messagesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando conversa…</p> : messagesQuery.isError ? <div className="grid min-h-[280px] place-items-center text-center"><div><p className="text-sm font-bold text-destructive">Não foi possível carregar as mensagens.</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void messagesQuery.refetch()}>Tentar novamente</Button></div></div> : messagesQuery.data?.length ? messagesQuery.data.map(item => <article key={item.message.id} className="max-w-[82%] rounded-2xl bg-card p-3 shadow-sm"><p className="text-xs font-extrabold text-primary">{item.sender}</p><p className="mt-1 text-sm leading-relaxed">{item.message.body}</p><p className="mt-2 text-[10px] text-muted-foreground">Expira às {new Date(item.message.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></article>) : <p className="grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">Ainda não há mensagens. Inicie a conversa.</p>}
        </div>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (body.trim()) sendMutation.mutate({ body, recipientUserId }); }}><Input value={body} maxLength={1200} onChange={event => setBody(event.target.value)} placeholder="Digite uma mensagem…" /><Button type="submit" disabled={!body.trim() || sendMutation.isPending}><Send className="mr-2 h-4 w-4" />Enviar</Button></form>
      </CardContent>
    </Card>
  </section>;
}
