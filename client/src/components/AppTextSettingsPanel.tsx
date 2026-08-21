import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_APP_TEXTS, type AppTexts } from "@/contexts/AppTextContext";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Type } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type FieldKey = keyof AppTexts;
type Field = { key: FieldKey; label: string; multiline?: boolean; hint?: string };

const sections: Array<{ title: string; description: string; fields: Field[] }> = [
  {
    title: "Identidade do aplicativo",
    description: "Defina como a marca aparece nas telas públicas e autenticadas.",
    fields: [
      { key: "appName", label: "Nome do aplicativo" },
      { key: "slogan", label: "Slogan" },
    ],
  },
  {
    title: "Tela de boas-vindas",
    description: "Apresentação exibida antes do login dos operadores.",
    fields: [
      { key: "welcomeTitle", label: "Título de boas-vindas" },
      { key: "welcomeDescription", label: "Descrição de boas-vindas", multiline: true },
    ],
  },
  {
    title: "Navegação",
    description: "Rótulos do menu principal. Mantenha textos curtos para facilitar a leitura no celular.",
    fields: [
      { key: "navOverview", label: "Visão Geral" },
      { key: "navBranches", label: "Filiais" },
      { key: "navHistory", label: "Históricos" },
      { key: "navUtilities", label: "Utilidades" },
      { key: "navChat", label: "Chat" },
      { key: "navSettings", label: "Ajustes" },
      { key: "navPreferences", label: "Preferências" },
      { key: "navAccount", label: "Conta" },
    ],
  },
  {
    title: "Páginas do painel",
    description: "Títulos e descrições mostrados nas áreas principais do sistema.",
    fields: [
      { key: "overviewTitle", label: "Título da Visão Geral" },
      { key: "overviewDescription", label: "Descrição da Visão Geral", multiline: true },
      { key: "utilitiesTitle", label: "Título de Utilidades" },
      { key: "utilitiesDescription", label: "Descrição de Utilidades", multiline: true },
      { key: "subscriptionTitle", label: "Título do Plano" },
      { key: "subscriptionDescription", label: "Descrição do Plano", multiline: true },
    ],
  },
];

export default function AppTextSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.appTexts.get.useQuery();
  const updateMutation = trpc.appTexts.update.useMutation();
  const [values, setValues] = useState<AppTexts>(DEFAULT_APP_TEXTS);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const next = { ...DEFAULT_APP_TEXTS };
    for (const key of Object.keys(next) as FieldKey[]) next[key] = settingsQuery.data[key];
    setValues(next);
  }, [settingsQuery.data]);

  function updateValue(key: FieldKey, value: string) {
    setValues(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await updateMutation.mutateAsync(values);
      await utils.appTexts.get.invalidate();
      toast.success("Textos do aplicativo atualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os textos.");
    }
  }

  if (settingsQuery.isLoading) return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="flex items-center gap-3 p-7 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />Carregando textos do aplicativo…</CardContent></Card>;
  if (settingsQuery.isError) return <Card className="rounded-[1.6rem] border-border/70 shadow-sm"><CardContent className="p-7"><p className="text-sm font-bold text-destructive">Não foi possível carregar os textos do aplicativo.</p><Button className="mt-4" variant="outline" onClick={() => void settingsQuery.refetch()}>Tentar novamente</Button></CardContent></Card>;

  return <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Type className="h-5 w-5 text-primary" />Textos do aplicativo</CardTitle><CardDescription>Personalize as frases visíveis da marca. As alterações ficam disponíveis para operadores e visitantes assim que forem salvas.</CardDescription></CardHeader>
    <CardContent>
      <form className="space-y-8" onSubmit={submit}>
        {sections.map(section => <section key={section.title} className="rounded-2xl border border-border/70 p-4 sm:p-5"><div className="mb-4"><h3 className="font-extrabold">{section.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.description}</p></div><div className="grid gap-4 sm:grid-cols-2">{section.fields.map(field => <div key={field.key} className={field.multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}><Label htmlFor={`app-text-${field.key}`}>{field.label}</Label>{field.multiline ? <Textarea id={`app-text-${field.key}`} value={values[field.key]} maxLength={field.key.includes("Description") ? 600 : 240} onChange={event => updateValue(field.key, event.target.value)} className="min-h-24 resize-y" required /> : <Input id={`app-text-${field.key}`} value={values[field.key]} maxLength={field.key.startsWith("nav") ? 80 : field.key === "appName" ? 100 : 180} onChange={event => updateValue(field.key, event.target.value)} required />}</div>)}</div></section>)}
        <div className="flex justify-end"><Button type="submit" className="rounded-xl px-5 font-extrabold" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar textos</Button></div>
      </form>
    </CardContent>
  </Card>;
}
