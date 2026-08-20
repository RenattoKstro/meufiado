import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, MessageCircle, MessagesSquare, Send, TimerReset, UsersRound } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

function usePrivateRecipient() {
  const search = useSearch();
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const value = Number(params.get("perfil"));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }, [search]);
}

export default function Chat() {
  const { user } = useAuth();
  const recipientUserId = usePrivateRecipient();
  const [, setLocation] = useLocation();
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const privateThreadsQuery = trpc.chat.privateThreads.useQuery(undefined, { refetchInterval: 5_000 });
  const messagesQuery = recipientUserId
    ? trpc.chat.private.useQuery({ recipientUserId }, { refetchInterval: 5_000 })
    : trpc.chat.general.useQuery(undefined, { refetchInterval: 5_000 });
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: async () => {
      setBody("");
      await (recipientUserId ? utils.chat.private.invalidate({ recipientUserId }) : utils.chat.general.invalidate());
      await utils.chat.privateThreads.invalidate();
      await utils.chat.unreadCount.invalidate();
    },
    onError: () => toast.error("Não foi possível enviar a mensagem. Tente novamente."),
  });
  const markRead = trpc.chat.markRead.useMutation({ onSuccess: () => void utils.chat.unreadCount.invalidate() });
  const latestMessageId = messagesQuery.data?.at(-1)?.message.id;
  useEffect(() => {
    if (!messagesQuery.isLoading && !messagesQuery.isError) markRead.mutate();
  // A conversa aberta não deve acumular notificações. A mutation não invalida esta query, evitando recarregamento cíclico.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestMessageId, recipientUserId, messagesQuery.isLoading, messagesQuery.isError]);
  const activeThread = privateThreadsQuery.data?.find(thread => thread.recipientUserId === recipientUserId);
  const title = recipientUserId ? activeThread?.recipientName ?? "Conversa privada" : "Chat geral";

  return <section className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Comunicação</p><h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted-foreground">As mensagens são atualizadas a cada poucos segundos e desaparecem automaticamente após 1 hora.</p></div>
    <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card className="overflow-hidden rounded-[1.7rem] border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70 px-4 py-4"><CardTitle className="text-sm">Conversas</CardTitle><CardDescription>Escolha o tipo de chat.</CardDescription></CardHeader>
        <CardContent className="space-y-2 p-3">
          <Button type="button" variant={!recipientUserId ? "secondary" : "ghost"} onClick={() => setLocation("/chat")} className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-left"><UsersRound className="h-4 w-4" />Chat geral</Button>
          <div className="px-2 pt-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Chats privados</p></div>
          {privateThreadsQuery.isLoading ? <p className="px-2 py-2 text-xs text-muted-foreground">Carregando conversas…</p> : privateThreadsQuery.data?.length ? privateThreadsQuery.data.map(thread => <button type="button" key={thread.recipientUserId} onClick={() => setLocation(`/chat?perfil=${thread.recipientUserId}`)} className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${recipientUserId === thread.recipientUserId ? "bg-primary/10 text-primary" : "hover:bg-muted/70"}`}><div className="flex items-center gap-1.5"><span className="truncate text-sm font-extrabold">{thread.recipientName}</span>{thread.recipientRole === "admin" && <Badge className="h-4 rounded-full px-1 text-[8px]">Admin</Badge>}</div><p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{thread.lastMessageBody}</p></button>) : <p className="px-2 py-2 text-xs leading-relaxed text-muted-foreground">Suas conversas privadas aparecerão aqui após a primeira mensagem.</p>}
        </CardContent>
      </Card>
      <Card className="overflow-hidden rounded-[1.7rem] border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70"><CardTitle className="flex items-center gap-2"><MessagesSquare className="h-5 w-5 text-primary" />{title}</CardTitle><CardDescription className="flex items-center gap-1"><TimerReset className="h-3.5 w-3.5" />Mensagens temporárias — expiram em 1 hora.</CardDescription></CardHeader>
        <CardContent className="space-y-3 p-5">
        <div className="min-h-[320px] space-y-3 rounded-2xl bg-muted/35 p-4">
          {messagesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando conversa…</p> : messagesQuery.isError ? <div className="grid min-h-[280px] place-items-center text-center"><div><p className="text-sm font-bold text-destructive">Não foi possível carregar as mensagens.</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void messagesQuery.refetch()}>Tentar novamente</Button></div></div> : messagesQuery.data?.length ? messagesQuery.data.map(item => { const ownMessage = item.senderId === user?.id; const sentAt = new Date(item.message.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); return <article key={item.message.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2.5 shadow-sm ${ownMessage ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-card-foreground"}`}><div className="flex flex-wrap items-center gap-1.5"><p className={`text-xs font-extrabold ${ownMessage ? "text-primary-foreground" : "text-primary"}`}>{ownMessage ? "Você" : item.sender ?? "Usuário"}</p>{item.senderRole === "admin" && <Badge className={`h-5 gap-1 rounded-full px-1.5 text-[9px] font-black ${ownMessage ? "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15" : "bg-primary/10 text-primary hover:bg-primary/10"}`}><BadgeCheck className="h-3 w-3" />Admin</Badge>}</div><p className="mt-1 text-sm leading-relaxed">{item.message.body}</p><p className={`mt-2 text-[10px] ${ownMessage ? "text-primary-foreground/75" : "text-muted-foreground"}`}>Expira às {sentAt}</p></div></article>; }) : <p className="grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">Ainda não há mensagens. Inicie a conversa.</p>}
        </div>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (body.trim()) sendMutation.mutate({ body, recipientUserId }); }}><Input value={body} maxLength={1200} onChange={event => setBody(event.target.value)} placeholder="Digite uma mensagem…" /><Button type="submit" disabled={!body.trim() || sendMutation.isPending}><Send className="mr-2 h-4 w-4" />Enviar</Button></form>
        </CardContent>
      </Card>
    </div>
  </section>;
}
