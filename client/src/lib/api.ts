import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const table = (name: string) => supabase.from(name);

async function currentUser() {
  const { data: session } = await supabase.auth.getSession();
  const authId = session.session?.user.id;
  if (!authId) return null;
  const { data, error } = await table("users").select("*").eq("authUserId", authId).maybeSingle();
  if (error) throw error;
  return data;
}

async function profileMine() {
  const user = await currentUser();
  if (!user) return null;
  const [{ data: profile, error: profileError }, { data: branch, error: branchError }] = await Promise.all([
    table("userProfiles").select("*").eq("userId", user.id).maybeSingle(),
    profileBranch(user.id),
  ]);
  if (profileError) throw profileError;
  if (branchError) throw branchError;
  return { user, profile, branch };
}

async function profileBranch(userId: number) {
  const { data: profile, error } = await table("userProfiles").select("branchId").eq("userId", userId).maybeSingle();
  if (error) return { data: null, error };
  if (!profile?.branchId) return { data: null, error: null };
  return table("branches").select("*").eq("id", profile.branchId).maybeSingle();
}

async function metricsMine() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await table("metricSettings").select("*").eq("userId", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

async function subscriptionMine() {
  const user = await currentUser();
  if (!user) return null;
  const [{ data: settings, error: settingsError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    table("subscriptionSettings").select("*").limit(1).maybeSingle(),
    table("mercadoPagoSubscriptions").select("*").eq("userId", user.id).order("createdAt", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (settingsError) throw settingsError;
  if (subscriptionError) throw subscriptionError;
  const isPro = user.role === "admin" || (user.plan === "pro" && (!user.proExpiresAt || new Date(user.proExpiresAt).getTime() >= Date.now()));
  return { user, settings, subscription, isPro, plan: user.plan, proExpiresAt: user.proExpiresAt };
}

async function dispatchQuery(path: string[], input: unknown) {
  const key = path.join(".");
  switch (key) {
    case "profile.mine": return profileMine();
    case "metrics.mine": return metricsMine();
    case "subscription.mine": return subscriptionMine();
    case "appTexts.get": { const { data, error } = await table("appTextSettings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; }
    case "maintenance.get": { const { data, error } = await table("maintenanceSettings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; }
    case "profile.branches": { const { data, error } = await table("branches").select("*").eq("isActive", true).order("name"); if (error) throw error; return data ?? []; }
    case "utilities.downloads": { const { data, error } = await table("utilityDownloads").select("*").order("isPinned", { ascending: false }).order("title"); if (error) throw error; return data ?? []; }
    case "utilities.reports": { const { data, error } = await table("utilityReports").select("*").order("createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "updates.list": case "updatesAdmin.list": { const { data, error } = await table("updateNotes").select("*").order("createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "matrix.mine": case "matrix.overview": { const { data, error } = await table("matrixMetrics").select("*, branches(*)").order("branchId"); if (error) throw error; const items = (data ?? []).map((row: any) => ({ branch: row.branches, metrics: row.id ? row : null, updatedAt: row.updatedAt })); return key.endsWith("mine") ? { metrics: items[0]?.metrics ?? null } : items; }
    case "matrix.importStatus": { const { data, error } = await table("matrixImportSources").select("*").order("importedAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "admin.branches": { const { data, error } = await table("branches").select("*").order("name"); if (error) throw error; return data ?? []; }
    case "admin.users": { const [{ data: users, error: usersError }, { data: profiles, error: profilesError }, { data: branches, error: branchesError }] = await Promise.all([table("users").select("*"), table("userProfiles").select("*"), table("branches").select("*")]); if (usersError) throw usersError; if (profilesError) throw profilesError; if (branchesError) throw branchesError; return (profiles ?? []).map((profile: any) => ({ profile, account: (users ?? []).find((item: any) => item.id === profile.userId) ?? null, branch: (branches ?? []).find((item: any) => item.id === profile.branchId) ?? { id: profile.branchId, name: "Filial", code: null, regional: null } })); }
    case "branches.overview": { const [{ data: branches, error: branchesError }, { data: profiles, error: profilesError }, { data: metrics, error: metricsError }] = await Promise.all([table("branches").select("*").order("name"), table("userProfiles").select("*"), table("branchMetrics").select("*")]); if (branchesError) throw branchesError; if (profilesError) throw profilesError; if (metricsError) throw metricsError; return (branches ?? []).map((branch: any) => { const profile = (profiles ?? []).find((item: any) => item.branchId === branch.id && item.operatorType === "leader") ?? (profiles ?? []).find((item: any) => item.branchId === branch.id); return { branch, operator: profile ? { ...profile, id: profile.id, userId: profile.userId, fullName: profile.fullName, lastSignedIn: null } : null, metrics: (metrics ?? []).find((item: any) => item.branchId === branch.id) ?? { portfolioTotal: 0, monthOpening: 0, dayOpening: 0, currentOverdue: 0, creditGoal: 0, challengeGoal: 0, lostGoal: 0, lostReceived: 0, workingDaysTotal: 0, workingDaysElapsed: 0, ticketWorkingDaysRemaining: 0, ticketReachedByMatrix: false, fiadoAtDay15: false, monthlyLoss: 0, lossSalesPercent: 0 }, updatedAt: branch.updatedAt }; }); }
    case "history.list": { const month = (input as { month?: string } | undefined)?.month; const user = await currentUser(); const { data: profile } = user ? await table("userProfiles").select("branchId").eq("userId", user.id).maybeSingle() : { data: null }; let query = table("receiptHistoryEntries").select("*").order("entryDate"); if (profile?.branchId) query = query.eq("branchId", profile.branchId); if (month) query = query.gte("entryDate", `${month}-01`).lt("entryDate", `${month}-32`); const { data, error } = await query; if (error) throw error; return data ?? []; }
    case "history.dailyStatus": return { hasBranch: Boolean((await profileMine())?.branch), hasEntry: false };
    case "chat.supportRecipient": { const { data, error } = await table("users").select("id,name,role,supportAvailability").eq("role", "admin").limit(1).maybeSingle(); if (error) throw error; return data; }
    case "chat.general": case "chat.private": case "chat.privateThreads": { const { data, error } = await table("chatMessages").select("*").order("createdAt"); if (error) throw error; return data ?? []; }
    case "chat.unreadCount": case "updates.unreadCount": return 0;
    case "chat.mySupportAvailability": { const user = await currentUser(); return user?.supportAvailability ?? "available"; }
    case "romaneio.parties": { const { data, error } = await table("romaneioParties").select("*").order("name"); if (error) throw error; return data ?? []; }
    case "romaneio.products": { const { data, error } = await table("romaneioProducts").select("*").order("description"); if (error) throw error; return data ?? []; }
    case "romaneio.list": { const user = await currentUser(); const { data, error } = await table("romaneios").select("*").eq("createdByUserId", user?.id ?? 0).order("createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "romaneio.get": { const id = (input as { id?: number } | undefined)?.id ?? 0; const { data, error } = await table("romaneios").select("*, romaneioItems(*), romaneioActivities(*)").eq("id", id).maybeSingle(); if (error) throw error; return data; }
    case "subscriptionAdmin.settings": { const { data, error } = await table("subscriptionSettings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; }
    default: return null;
  }
}

async function dispatchMutation(path: string[], input: any) {
  const key = path.join(".");
  const user = await currentUser();
  switch (key) {
    case "profile.account": { const { error } = await table("userProfiles").update({ fullName: input.fullName, phone: input.phone, instagram: input.instagram }).eq("userId", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "profile.preferences": { const { error } = await table("userProfiles").update(input).eq("userId", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "profile.presence": { const { error } = await table("users").update({ lastSignedIn: new Date().toISOString() }).eq("id", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "metrics.save": { const { data, error } = await table("metricSettings").upsert({ ...input, userId: user?.id }, { onConflict: "userId" }).select().single(); if (error) throw error; return data; }
    case "history.create": case "history.update": { const payload = { ...input, branchId: input.branchId ?? (await profileMine())?.profile?.branchId, createdByUserId: user?.id }; const { data, error } = await table("receiptHistoryEntries").upsert(payload).select().single(); if (error) throw error; return data; }
    case "history.delete": { const { error } = await table("receiptHistoryEntries").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "appTexts.update": { const { data, error } = await table("appTextSettings").update(input).gt("id", 0).select().single(); if (error) throw error; return data; }
    case "maintenance.update": { const { data, error } = await table("maintenanceSettings").update(input).gt("id", 0).select().single(); if (error) throw error; return data; }
    case "profile.complete": { const { error } = await table("userProfiles").upsert({ ...input, userId: user?.id, profileComplete: true }, { onConflict: "userId" }); if (error) throw error; return { success: true }; }
    case "chat.send": { const { data, error } = await table("chatMessages").insert({ ...input, senderUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "chat.markRead": case "updates.markRead": return { success: true };
    case "chat.setSupportAvailability": { const { error } = await table("users").update({ supportAvailability: input.status }).eq("id", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "admin.setBranchStatus": { const { data, error } = await table("branches").update({ isActive: input.isActive }).eq("id", input.id).select().single(); if (error) throw error; return data; }
    case "admin.createBranch": { const { data, error } = await table("branches").insert({ name: input.name, code: input.code ?? null, isActive: true }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.createDownload": case "utilityAdmin.updateDownload": { const id = input.id; const { data, error } = id ? await table("utilityDownloads").update(input).eq("id", id).select().single() : await table("utilityDownloads").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.createReport": case "utilityAdmin.updateReport": { const id = input.id; const { data, error } = id ? await table("utilityReports").update(input).eq("id", id).select().single() : await table("utilityReports").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.deleteDownload": { const { error } = await table("utilityDownloads").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "utilityAdmin.deleteReport": { const { error } = await table("utilityReports").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "updatesAdmin.create": case "updatesAdmin.update": { const id = input.id; const { data, error } = id ? await table("updateNotes").update(input).eq("id", id).select().single() : await table("updateNotes").insert(input).select().single(); if (error) throw error; return data; }
    case "updatesAdmin.delete": { const { error } = await table("updateNotes").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "romaneio.create": { const { data, error } = await table("romaneios").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "subscription.createPixPayment": throw new Error("Pagamento Mercado Pago requer uma Edge Function Supabase segura.");
    default: throw new Error(`Operação ainda não migrada: ${key}`);
  }
}

type AnyOptions = Record<string, unknown>;
function makeProcedure(path: string[]) {
  return {
    useQuery: (input?: unknown, options?: AnyOptions): any => useQuery({ ...(options as any), queryKey: ["supabase", ...path, input], queryFn: () => dispatchQuery(path, input) } as any),
    useMutation: (options?: AnyOptions): any => useMutation({ ...(options as any), mutationFn: (input: unknown) => dispatchMutation(path, input) } as any),
  };
}

const rootTarget: Record<string, unknown> = {};
const root = new Proxy(rootTarget, { get: (target, property: string) => property in target ? target[property] : new Proxy({}, { get: (_nested, procedure: string) => makeProcedure([property, procedure]) }) });
export const api: any = Object.assign(root, {
  useUtils: () => {
    const client = useQueryClient();
    return new Proxy({}, { get: (_target, namespace: string) => new Proxy({}, { get: (_nested, procedure: string) => ({ invalidate: () => client.invalidateQueries({ queryKey: ["supabase", namespace, procedure] }), setData: () => undefined }) }) });
  },
});
