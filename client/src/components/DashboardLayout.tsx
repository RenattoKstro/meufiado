import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppTexts } from "@/contexts/AppTextContext";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { delinquencyPercentage } from "@shared/goalRules";
import { BarChart3, BellRing, Building2, ChevronDown, CircleHelp, Crown, FolderDown, History, LayoutDashboard, LockKeyhole, LogOut, MessageCircle, Moon, Palette, Pencil, ShieldCheck, SlidersHorizontal, Sun, TableProperties } from "lucide-react";
import React from "react";
import { Link, useLocation } from "wouter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const texts = useAppTexts();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const subscriptionQuery = trpc.subscription.mine.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 15_000, refetchOnWindowFocus: true });
  const chatIsFree = subscriptionQuery.data?.settings.chatPlan === "free";
  const canUseChat = user?.role === "admin" || subscriptionQuery.data?.isPro || chatIsFree;
  const unreadChatQuery = trpc.chat.unreadCount.useQuery(undefined, { enabled: Boolean(user) && Boolean(canUseChat), refetchInterval: 5_000 });
  const profileQuery = trpc.profile.mine.useQuery(undefined, { enabled: Boolean(user) });
  const metricsQuery = trpc.metrics.mine.useQuery(undefined, { enabled: Boolean(user) });
  const presenceMutation = trpc.profile.presence.useMutation();
  React.useEffect(() => {
    if (!user) return;
    const announcePresence = () => presenceMutation.mutate();
    announcePresence();
    const interval = window.setInterval(announcePresence, 60_000);
    return () => window.clearInterval(interval);
  // A presença é apenas um sinal leve de atividade para o atendimento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const navigation = [
    { label: texts.navOverview, path: "/", icon: LayoutDashboard },
    { label: "Matriz", path: "/matriz", icon: TableProperties, proOnly: true },
    { label: texts.navBranches, path: "/filiais", icon: Building2, feature: "branches" as const },
    { label: texts.navHistory, path: "/historicos", icon: History, feature: "history" as const },
    { label: texts.navUtilities, path: "/utilidades", icon: FolderDown, feature: "utilities" as const },
    { label: texts.navChat, path: "/chat", icon: MessageCircle, feature: "chat" as const },
    { label: "Plano", path: "/plano", icon: Crown },
    { label: texts.navSettings, path: "/ajustes", icon: SlidersHorizontal },
    { label: texts.navPreferences, path: "/configuracoes", icon: Palette },
    { label: "Ajuda", path: "/ajuda", icon: CircleHelp },
    { label: "Atualizações", path: "/atualizacoes", icon: BellRing },
  ];
  const administrativeNavigation = { label: "Administração", path: "/admin", icon: ShieldCheck };
  const menu = user?.role === "admin" ? [...navigation, administrativeNavigation] : navigation;
  const active = menu.find(item => item.path === location)?.label ?? "Painel";
  const initials = user?.name?.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() || "OP";
  const portfolioTotal = metricsQuery.data?.portfolioTotal ?? 0;
  const delinquency = metricsQuery.data ? delinquencyPercentage(metricsQuery.data.currentOverdue, portfolioTotal) : null;
  const hasDelinquency = delinquency !== null && portfolioTotal > 0;
  const delinquencyClass = delinquency !== null && delinquency < 7 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
  function isLocked(item: typeof navigation[number]) {
    if (user?.role === "admin") return false;
    if (item.proOnly) return !subscriptionQuery.data?.isPro;
    if (!item.feature) return false;
    const configuredPlan = subscriptionQuery.data?.settings[`${item.feature}Plan` as const] ?? "pro";
    return !subscriptionQuery.data?.isPro && configuredPlan === "pro";
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="h-[82px] justify-center px-3">
          <div className="flex items-center gap-3 px-1">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-extrabold tracking-tight text-sidebar-foreground">
                {texts.appName}{hasDelinquency && <span className={`ml-1.5 ${delinquencyClass}`}>{Math.round(delinquency)}%</span>}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Painel de metas</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground group-data-[collapsible=icon]:hidden">Acompanhamento</p>
          <SidebarMenu>
            {menu.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location === item.path}
                  tooltip={item.label}
                  className="h-11 rounded-xl px-3 text-sm font-semibold transition-all data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md data-[active=true]:shadow-primary/20"
                >
                  <Link href={item.path}>
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {isLocked(item as typeof navigation[number]) && <LockKeyhole className="ml-auto h-3.5 w-3.5 text-muted-foreground group-data-[active=true]:text-primary-foreground group-data-[collapsible=icon]:hidden" />}
                    {item.path === "/chat" && (unreadChatQuery.data ?? 0) > 0 && <Badge aria-label={`${unreadChatQuery.data} mensagens novas`} className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px] font-black group-data-[collapsible=icon]:hidden">{(unreadChatQuery.data ?? 0) > 99 ? "99+" : unreadChatQuery.data}</Badge>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          {user?.role === "admin" && (
            <div className="mx-1 mt-8 rounded-2xl bg-primary/10 p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2 text-primary"><Building2 className="h-4 w-4" /><span className="text-xs font-extrabold">Modo administrador</span></div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Acompanhe filiais, metas e mantenha os operadores atualizados.</p>
            </div>
          )}
        </SidebarContent>
        <SidebarFooter className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-9 w-9 border-2 border-primary/15"><AvatarImage src={profileQuery.data?.profile?.avatarUrl ?? undefined} alt={`Foto de ${user?.name || "perfil"}`} /><AvatarFallback className="bg-primary/10 text-xs font-extrabold text-primary">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-xs font-bold text-sidebar-foreground">{user?.name || "Operador"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user?.role === "admin" ? "Administrador" : subscriptionQuery.data?.status === "grace" ? "Operador PRO · carência" : subscriptionQuery.data?.isPro ? "Operador PRO" : "Operador Free"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-semibold">Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/conta")} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Editar conta</DropdownMenuItem>
              {user?.role !== "admin" && <DropdownMenuItem onClick={() => navigate("/plano")} className="cursor-pointer"><Crown className="mr-2 h-4 w-4" />Meu plano</DropdownMenuItem>}
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer"><span>{theme === "light" ? "Usar modo escuro" : "Usar modo claro"}</span>{theme === "light" ? <Moon className="ml-auto h-4 w-4" /> : <Sun className="ml-auto h-4 w-4" />}</DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        {isMobile && <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl"><SidebarTrigger className="h-9 w-9 rounded-xl border border-border bg-card shadow-sm" /><p className="text-sm font-extrabold tracking-tight">{active}</p></header>}
        <main className="min-h-screen p-4 sm:p-6 lg:p-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
