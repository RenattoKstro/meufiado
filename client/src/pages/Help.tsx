import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardList, Crown, FileSpreadsheet, Gauge, GitCompareArrows, History, LayoutDashboard, MessageCircle, ShieldCheck, TableProperties, Target, Users, Wrench } from "lucide-react";
import { Link } from "wouter";

type HelpSection = {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  points: string[];
  link?: { label: string; href: string };
};

const sections: HelpSection[] = [
  {
    value: "primeiros-passos",
    icon: CheckCircle2,
    title: "Primeiros passos",
    summary: "Comece pelo seu cadastro, filial e responsabilidade.",
    points: [
      "Complete seus dados de conta, escolha a filial e informe se atua como líder ou auxiliar.",
      "Líder e auxiliar compartilham as metas, resultados e históricos da mesma filial.",
      "Mantenha telefone e foto atualizados em Conta para facilitar o contato entre a equipe.",
    ],
    link: { label: "Abrir minha conta", href: "/conta" },
  },
  {
    value: "visao-geral",
    icon: LayoutDashboard,
    title: "Visão Geral e metas",
    summary: "Acompanhe o resultado atual da filial e o ritmo para alcançar as metas.",
    points: [
      "Meta Fiado e Meta Desafio mostram o percentual atual e as faixas de bonificação.",
      "Meta Diária é calculada pelo valor que falta para a Meta Fiado dividido pelos dias restantes.",
      "Rec. Hoje mostra o recebimento do dia. Preencha as configurações de meta e dias úteis para manter os cálculos corretos.",
      "A previsão, quando disponível, depende de lançamentos diários suficientes no Histórico.",
    ],
    link: { label: "Abrir Visão Geral", href: "/" },
  },
  {
    value: "historicos",
    icon: History,
    title: "Históricos e recebimentos diários",
    summary: "Registre o recebido de cada dia para acompanhar a evolução do mês.",
    points: [
      "Use Salvar recebimento para registrar o valor do dia e a data correspondente.",
      "Cada lançamento pode ser revisado, editado ou excluído quando necessário.",
      "Os registros pertencem à filial e são compartilhados entre líder e auxiliar.",
      "Lançamentos consistentes melhoram as projeções e o acompanhamento do ritmo de recebimento.",
    ],
    link: { label: "Abrir Históricos", href: "/historicos" },
  },
  {
    value: "filiais-matriz",
    icon: TableProperties,
    title: "Filiais e Matriz",
    summary: "Consulte resultados das lojas e compare filiais sem alterar os dados consolidados.",
    points: [
      "Em Filiais, busque por código, nome ou regional para consultar os indicadores e os contatos disponíveis.",
      "A Matriz é uma consulta exclusiva PRO e Administração; os operadores não podem editar seus dados.",
      "Digite até quatro códigos separados por vírgula para comparar lojas, como 359, 358, 165, 382.",
      "Use os filtros de visualização para ordenar por código ou por maior e menor efetividade. A melhor e a menor efetividade ficam destacadas automaticamente na comparação.",
    ],
    link: { label: "Abrir Matriz", href: "/matriz" },
  },
  {
    value: "plano",
    icon: Crown,
    title: "Plano Free e PRO",
    summary: "Entenda seu acesso, pagamento e a renovação da assinatura.",
    points: [
      "O perfil identifica seu plano como Free, PRO ou PRO em período de carência.",
      "O PRO libera os recursos definidos pela Administração, incluindo a consulta da Matriz quando configurada como exclusiva.",
      "O pagamento pode ser feito pelo checkout recorrente do Mercado Pago ou pelo fluxo manual disponível na tela Plano.",
      "Após cada renovação confirmada, o PRO vale por 30 dias e possui cinco dias de carência antes de retornar ao Free.",
    ],
    link: { label: "Ver meu plano", href: "/plano" },
  },
  {
    value: "recursos",
    icon: Wrench,
    title: "Chat, Utilidades e configurações",
    summary: "Use as ferramentas de apoio no dia a dia.",
    points: [
      "No Chat, acompanhe conversas gerais e privadas. O contador mostra mensagens novas.",
      "Em Utilidades, consulte Downloads, Relatórios, Calculadora 90% e o Romaneio, conforme seu plano.",
      "Em Ajustes, informe as metas e os dias úteis. Em Preferências, escolha tema e aparência do painel.",
      "Se estiver de férias, marque a opção correspondente no perfil para manter seu cadastro identificado corretamente.",
    ],
    link: { label: "Abrir Utilidades", href: "/utilidades" },
  },
];

export default function Help() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">Central de ajuda</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Como usar o Meu Fiado</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">Este manual reúne as instruções essenciais para acompanhar metas, lançar recebimentos, consultar filiais e aproveitar os recursos do seu plano.</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><BookOpen className="h-6 w-6" /></span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ManualStep icon={Target} title="1. Configure" text="Complete a conta e ajuste as metas." />
          <ManualStep icon={CalendarDays} title="2. Acompanhe" text="Registre os recebimentos todos os dias." />
          <ManualStep icon={Gauge} title="3. Decida" text="Use o painel para agir no ritmo certo." />
        </div>
      </header>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><ClipboardList className="h-4 w-4" /></span>
            <div>
              <p className="font-bold">Rotina recomendada</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">No início do mês, confira as metas e os dias úteis. Em cada dia de trabalho, registre o recebimento no Histórico e consulte a Visão Geral para ajustar o ritmo. Use a Matriz para comparar filiais quando o acesso PRO estiver disponível.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-3">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <AccordionItem key={section.value} value={section.value} className="overflow-hidden rounded-2xl border border-border bg-card px-5 shadow-sm">
              <AccordionTrigger className="gap-3 py-5 text-left hover:no-underline">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-extrabold">{section.title}</span><span className="mt-1 block text-sm font-normal text-muted-foreground">{section.summary}</span></span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pl-13">
                <ul className="space-y-2 pl-1 text-sm leading-relaxed text-muted-foreground">
                  {section.points.map(point => <li key={point} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{point}</span></li>)}
                </ul>
                {section.link && <Button asChild variant="outline" size="sm" className="mt-5 rounded-xl"><Link href={section.link.href}>{section.link.label}</Link></Button>}
              </AccordionContent>
            </AccordionItem>
          );
        })}
        {user?.role === "admin" && (
          <AccordionItem value="administracao" className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.035] px-5 shadow-sm">
            <AccordionTrigger className="gap-3 py-5 text-left hover:no-underline">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-extrabold">Administração</span><span className="mt-1 block text-sm font-normal text-muted-foreground">Orientações exclusivas para administrar usuários, planos e dados consolidados.</span></span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pl-13">
              <ul className="space-y-2 pl-1 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Gerencie usuários, filiais, permissões PRO, acessos e conteúdos de Utilidades.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Na importação da Matriz, envie o Excel completo com Analítico, Dados, Acomp.Meta Diaria, Meta Desafio Diária e Vencido_Dia.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>O Analítico define as filiais e regionais da Matriz; as demais abas apenas complementam indicadores pelo código da filial.</span></li>
              </ul>
              <Button asChild size="sm" className="mt-5 rounded-xl"><Link href="/admin">Abrir Administração</Link></Button>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <Card className="border-primary/15 bg-primary/[0.04] shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><p className="font-extrabold">Ainda precisa de orientação?</p><p className="mt-1 text-sm text-muted-foreground">Abra o Chat para falar com a equipe ou consulte novamente este manual quando necessário.</p></div>
          <Button asChild className="rounded-xl"><Link href="/chat"><MessageCircle className="mr-2 h-4 w-4" />Abrir Chat</Link></Button>
        </CardContent>
      </Card>
    </section>
  );
}

function ManualStep({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-extrabold">{title}</p><p className="text-xs leading-relaxed text-muted-foreground">{text}</p></div></div>;
}
