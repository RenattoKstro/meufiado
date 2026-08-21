import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import Account from "@/pages/Account";
import Branches from "@/pages/Branches";
import Chat from "@/pages/Chat";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import { AppearanceSettings, MetricsSettings } from "@/pages/Settings";
import UserLogin from "@/pages/UserLogin";
import UserRegistration from "@/pages/UserRegistration";
import Utilities from "@/pages/Utilities";
import Welcome from "@/pages/Welcome";
import { ShieldAlert } from "lucide-react";
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
  return <DashboardLayout><Switch><Route path="/" component={OverviewPage} /><Route path="/fiado" component={LegacyMetaRedirect} /><Route path="/desafio" component={LegacyMetaRedirect} /><Route path="/filiais" component={BranchesPage} /><Route path="/historicos" component={History} /><Route path="/utilidades" component={Utilities} /><Route path="/chat" component={Chat} /><Route path="/conta" component={Account} /><Route path="/ajustes" component={MetricsSettings} /><Route path="/configuracoes" component={AppearanceSettings} /><Route path="/admin" component={user.role === "admin" ? Admin : AdminAccessDenied} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

function App() { return <ErrorBoundary><ThemeProvider><TooltipProvider><Toaster /><AuthenticatedApp /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
function LoadingScreen() { return <div className="grid min-h-screen place-items-center bg-background"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>; }
function SuspendedScreen() { return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl shadow-primary/10"><p className="text-xl font-black">Acesso temporariamente inativo</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Seu cadastro está desativado. Fale com a administração da sua filial para regularizar o acesso.</p></div></main>; }
function AdminAccessDenied() { return <section className="mx-auto grid min-h-[60vh] max-w-xl place-items-center"><div className="rounded-[1.6rem] border border-border bg-card p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"><ShieldAlert className="h-5 w-5" /></span><h1 className="mt-5 text-xl font-black">Acesso administrativo necessário</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Esta área é exclusiva para administradores autorizados.</p></div></section>; }
export default App;
