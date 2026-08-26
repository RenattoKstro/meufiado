import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AppTextProvider } from "@/contexts/AppTextContext";
import { trpc } from "@/lib/trpc";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import Account from "@/pages/Account";
import Branches from "@/pages/Branches";
import Chat from "@/pages/Chat";
import Dashboard from "@/pages/Dashboard";
import Help from "@/pages/Help";
import History from "@/pages/History";
import Matrix from "@/pages/Matrix";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import { AppearanceSettings, MetricsSettings } from "@/pages/Settings";
import UserLogin from "@/pages/UserLogin";
import UserRegistration from "@/pages/UserRegistration";
import Utilities from "@/pages/Utilities";
import Subscription from "@/pages/Subscription";
import Updates from "@/pages/Updates";
import RomaneioShare from "@/pages/RomaneioShare";
import Welcome from "@/pages/Welcome";
import { ArrowRight, Crown, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

const OverviewPage = (_props: unknown) => <Dashboard />;
const BranchesPage = (_props: unknown) => <Branches />;

function LegacyMetaRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/", { replace: true }); }, [navigate]);
  return <LoadingScreen />;
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const profileQuery = trpc.profile.mine.useQuery(undefined, { enabled: Boolean(user) });
  const { applyPreferences } = useTheme();
  const hasOperatorProfile = Boolean(profileQuery.data?.profile?.profileComplete);
  useEffect(() => { const profile = profileQuery.data?.profile; if (profile) applyPreferences(profile.colorMode, profile.colorPalette); }, [applyPreferences, profileQuery.data?.profile]);
  useEffect(() => { if (user && ["/entrar", "/cadastro"].includes(location)) navigate("/", { replace: true }); }, [location, navigate, user]);
  if (loading) return <LoadingScreen />;
  if (!user) return <Switch><Route path="/admin/login" component={AdminLogin} /><Route path="/entrar" component={UserLogin} /><Route path="/cadastro" component={UserRegistration} /><Route component={Welcome} /></Switch>;
  if (profileQuery.isLoading) return <LoadingScreen />;
  if (!hasOperatorProfile && user.role !== "admin") return <Onboarding />;
  if (profileQuery.data?.profile?.isActive === false) return <SuspendedScreen />;
  return <DashboardLayout><Switch><Route path="/" component={OverviewPage} /><Route path="/fiado" component={LegacyMetaRedirect} /><Route path="/desafio" component={LegacyMetaRedirect} /><Route path="/matriz">{() => <SubscriptionFeature feature="matrix"><Matrix /></SubscriptionFeature>}</Route><Route path="/filiais">{() => <SubscriptionFeature feature="branches"><Branches /></SubscriptionFeature>}</Route><Route path="/historicos">{() => <SubscriptionFeature feature="history"><History /></SubscriptionFeature>}</Route><Route path="/utilidades">{() => <SubscriptionFeature feature="utilities"><Utilities /></SubscriptionFeature>}</Route><Route path="/chat" component={Chat} /><Route path="/plano" component={Subscription} /><Route path="/conta" component={Account} /><Route path="/ajustes" component={MetricsSettings} /><Route path="/configuracoes" component={AppearanceSettings} /><Route path="/ajuda" component={Help} /><Route path="/atualizacoes" component={Updates} /><Route path="/admin" component={user.role === "admin" ? Admin : AdminAccessDenied} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

function SubscriptionFeature({ feature, children }: { feature: "matrix" | "branches" | "history" | "utilities" | "chat"; children: React.ReactNode }) {
  const { user } = useAuth();
  const subscriptionQuery = trpc.subscription.mine.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 15_000, refetchOnWindowFocus: true });
  if (user?.role === "admin") return <>{children}</>;
  if (subscriptionQuery.isLoading) return <LoadingScreen />;
  const settings = subscriptionQuery.data?.settings;
  const requiredPlan = feature === "matrix" ? "pro" : settings?.[`${feature}Plan` as const] ?? "pro";
  if (subscriptionQuery.data?.isPro || requiredPlan === "free") return <>{children}</>;
  return <ProFeatureGate />;
}

function ProFeatureGate() {
  const [, navigate] = useLocation();
  return <section className="mx-auto grid min-h-[62vh] max-w-xl place-items-center"><Card className="w-full overflow-hidden rounded-[1.8rem] border-primary/20 bg-card shadow-xl shadow-primary/10"><CardContent className="p-7 text-center sm:p-10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Crown className="h-7 w-7" /></span><p className="mt-6 text-xs font-black uppercase tracking-[.14em] text-primary">Acesso PRO</p><h1 className="mt-2 text-2xl font-black tracking-[-0.035em]">FUNÇÃO DISPONÍVEL APENAS PARA USUÁRIOS PRO</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Conheça as opções do plano, veja o valor vigente e libere os recursos premium da sua conta.</p><Button type="button" className="mt-7 h-11 rounded-xl px-5 font-extrabold" onClick={() => navigate("/plano")}><Crown className="mr-2 h-4 w-4" />Ir para a tela de Plano<ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card></section>;
}

function App() { return <ErrorBoundary><ThemeProvider><AppTextProvider><TooltipProvider><Toaster /><Switch><Route path="/romaneio/:token" component={RomaneioShare} /><Route component={AuthenticatedApp} /></Switch></TooltipProvider></AppTextProvider></ThemeProvider></ErrorBoundary>; }
function LoadingScreen() { return <div className="grid min-h-screen place-items-center bg-background"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>; }
function SuspendedScreen() { return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl shadow-primary/10"><p className="text-xl font-black">Acesso temporariamente inativo</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Seu cadastro está desativado. Fale com a administração da sua filial para regularizar o acesso.</p></div></main>; }
function AdminAccessDenied() { return <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center"><div className="rounded-[1.6rem] border border-border bg-card p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"><ShieldAlert className="h-5 w-5" /></span><h1 className="mt-5 text-xl font-black">Acesso administrativo necessário</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Esta área é exclusiva para administradores autorizados.</p></div></section>; }
export default App;
