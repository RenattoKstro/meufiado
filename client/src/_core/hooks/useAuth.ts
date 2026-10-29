import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AppUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  plan: "free" | "pro";
  proExpiresAt: string | null;
  supportAvailability: "available" | "away" | "busy";
  loginMethod: string | null;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const authUser = sessionData.session?.user;
      if (!authUser) {
        setUser(null);
        return null;
      }
      const { data: appUser, error: profileError } = await supabase
        .from("users")
        .select("id,openId,name,email,role,plan,proExpiresAt,supportAvailability,loginMethod")
        .eq("authUserId", authUser.id)
        .maybeSingle();
      if (profileError) throw profileError;
      const normalized = appUser as AppUser | null;
      setUser(normalized);
      try { localStorage.setItem("meu-fiado-user", JSON.stringify(normalized)); } catch {}
      return normalized;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Não foi possível verificar a sessão.");
      setError(normalized);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
    const { data } = supabase.auth.onAuthStateChange(() => { void loadUser(); });
    return () => data.subscription.unsubscribe();
  }, [loadUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    window.location.href = redirectPath || "/entrar";
  }, [loading, redirectOnUnauthenticated, redirectPath, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh: loadUser,
    logout,
  };
}
