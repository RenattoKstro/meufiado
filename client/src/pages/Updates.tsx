import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, FileSpreadsheet, MessageCircleMore, Sparkles } from "lucide-react";

const updates = [
  {
    date: "26 de agosto de 2026",
    title: "Aciona One: lista compacta para impressão",
    description: "A exportação em Excel ganhou linhas compactas, filtros, grades, ajuste horizontal e telefones separados em colunas para caber mais contatos em cada página.",
    icon: FileSpreadsheet,
    tag: "Utilidades",
  },
  {
    date: "26 de agosto de 2026",
    title: "Exportações em Excel e PDF",
    description: "A lista revisada no Aciona One pode ser exportada em Excel ou PDF A4 horizontal, preservando os filtros e as colunas selecionadas.",
    icon: CheckCircle2,
    tag: "Aciona One",
  },
  {
    date: "26 de agosto de 2026",
    title: "Atendimento mais organizado",
    description: "O administrador pode definir seu status de atendimento e as respostas rápidas do suporte registram um assunto para facilitar a organização das conversas.",
    icon: MessageCircleMore,
    tag: "Atendimento",
  },
];

export default function Updates() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 rounded-[1.8rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-primary">Acompanhe as novidades</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground">Atualizações</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Veja as melhorias mais recentes do Meu Fiado. Este histórico é visível para todos os usuários.</p>
          </div>
        </div>
      </div>

      <section aria-label="Histórico de atualizações" className="space-y-4">
        {updates.map((update, index) => {
          const Icon = update.icon;
          return (
            <Card key={update.title} className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
              <CardContent className="flex gap-4 p-5 sm:p-6">
                <div className="relative flex flex-col items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4.5 w-4.5" /></span>
                  {index < updates.length - 1 && <span className="absolute top-12 h-[calc(100%+1rem)] w-px bg-border" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold">{update.tag}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">{update.date}</span>
                  </div>
                  <h2 className="mt-3 text-base font-extrabold tracking-tight text-foreground sm:text-lg">{update.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{update.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
