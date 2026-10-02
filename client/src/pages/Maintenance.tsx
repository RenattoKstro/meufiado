import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Wrench } from "lucide-react";

export default function Maintenance() {
  const query = trpc.maintenance.get.useQuery(undefined, { staleTime: 5_000 });
  const settings = query.data;
  if (!settings) return <div className="grid min-h-screen place-items-center bg-background"><Wrench className="h-8 w-8 animate-pulse text-primary" /></div>;
  const open = (url: string) => { if (/^https?:\/\//.test(url)) window.location.href = url; else window.location.assign(url); };
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-6"><div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" /><Card className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border-primary/15 bg-card shadow-2xl shadow-primary/10"><CardContent className="p-8 text-center sm:p-12">{settings.imageUrl ? <img src={settings.imageUrl} alt="" className="mx-auto mb-7 max-h-44 max-w-full rounded-2xl object-contain" /> : <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary"><Wrench className="h-8 w-8" /></span>}<p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-primary">Meu Fiado</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{settings.title}</h1><p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">{settings.message}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button type="button" className="rounded-xl font-extrabold" onClick={() => open(settings.primaryUrl)}>{settings.primaryLabel}</Button><Button type="button" variant="outline" className="rounded-xl font-extrabold" onClick={() => open(settings.secondaryUrl)}><RefreshCw className="mr-2 h-4 w-4" />{settings.secondaryLabel}</Button></div></CardContent></Card></main>;
}
