import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { analyticRowFromSpreadsheet, challengeDailyRowFromSpreadsheet, dataRowFromSpreadsheet, dailyTrackingRowFromSpreadsheet, receiptDailyRowFromSpreadsheet, uniqueRowsByBranchCode, normalizeBranchCode } from "../../../shared/importRules";

const table = (name: string) => supabase.from(name);

async function currentUser() {
  const { data: session } = await supabase.auth.getSession();
  const authId = session.session?.user.id;
  if (!authId) return null;
  const { data, error } = await table("users").select("*").eq("authUserId", authId).maybeSingle();
  if (error) throw error;
  return data;
}

async function profileBranch(userId: number) {
  const { data: profile, error } = await table("userProfiles").select("branchId").eq("userId", userId).maybeSingle();
  if (error) throw error;
  if (!profile?.branchId) return null;
  const { data: branch, error: branchError } = await table("branches").select("*").eq("id", profile.branchId).maybeSingle();
  if (branchError) throw branchError;
  return branch;
}

async function profileMine() {
  const user = await currentUser();
  if (!user) return null;
  const [{ data: profile, error: profileError }, branch] = await Promise.all([
    table("userProfiles").select("*").eq("userId", user.id).maybeSingle(),
    profileBranch(user.id),
  ]);
  if (profileError) throw profileError;
  return { user, profile, branch };
}

async function metricsMine() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await table("metricSettings").select("*").eq("userId", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

async function branchForCurrentUser() {
  const user = await currentUser();
  if (!user) return { user: null, branchId: null as number | null };
  const { data, error } = await table("userProfiles").select("branchId").eq("userId", user.id).maybeSingle();
  if (error) throw error;
  return { user, branchId: data?.branchId ?? null };
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

async function importMatrixWorkbook(input: any) {
  const parseRows = <T extends { code: string }>(rows: any[], parser: (row: unknown[]) => T | null) => uniqueRowsByBranchCode((rows ?? []).map(parser).filter((row): row is T => row !== null));
  const analytic = parseRows(input.analytic, analyticRowFromSpreadsheet);
  const data = parseRows(input.data, dataRowFromSpreadsheet);
  const dailyTracking = parseRows(input.dailyTracking, dailyTrackingRowFromSpreadsheet);
  const challengeDaily = parseRows(input.challengeDaily, challengeDailyRowFromSpreadsheet);
  const receiptDaily = parseRows(input.receiptDaily, receiptDailyRowFromSpreadsheet);
  if (!analytic.length) throw new Error("A aba Analítico não possui filiais válidas. Verifique se a Filial está na coluna A.");

  const [{ data: branches, error: branchesError }, { data: matrices, error: matricesError }] = await Promise.all([
    table("branches").select("*").limit(5000),
    table("matrixMetrics").select("*").limit(5000),
  ]);
  if (branchesError) throw branchesError;
  if (matricesError) throw matricesError;
  const matrixByBranch = new Map((matrices ?? []).map((row: any) => [row.branchId, row]));
  const branchByCode = new Map<string, any>();
  for (const branch of branches ?? []) {
    const code = normalizeBranchCode(branch.code);
    if (code && (!branchByCode.has(code) || matrixByBranch.has(branch.id))) branchByCode.set(code, branch);
  }
  const byCode = <T extends { code: string }>(rows: T[]) => new Map(rows.map(row => [row.code, row]));
  const analyticByCode = byCode(analytic), dataByCode = byCode(data), trackingByCode = byCode(dailyTracking), challengeByCode = byCode(challengeDaily), receiptByCode = byCode(receiptDaily);
  let imported = 0;
  let createdBranches = 0;
  for (const [code, row] of Array.from(analyticByCode.entries())) {
    let branch = branchByCode.get(code);
    if (!branch) {
      const { data: created, error } = await table("branches").insert({ code, name: `Filial ${code}`, regional: row.regional || null, isActive: true }).select("*").single();
      if (error) throw error;
      branch = created;
      branchByCode.set(code, branch);
      createdBranches += 1;
    } else if (row.regional && branch.regional !== row.regional) {
      const { error } = await table("branches").update({ regional: row.regional, updatedAt: new Date().toISOString() }).eq("id", branch.id);
      if (error) throw error;
    }
    const previous = matrixByBranch.get(branch.id) ?? {};
    const extra = dataByCode.get(code), tracking = trackingByCode.get(code), challenge = challengeByCode.get(code), receipts = receiptByCode.get(code);
    const values = {
      branchId: branch.id, creditGoal: row.creditGoal ?? previous.creditGoal ?? 0, challengeGoal: row.challengeGoal ?? previous.challengeGoal ?? 0, received: row.received ?? previous.received ?? 0,
      delinquencyPercent: row.delinquencyPercent ?? previous.delinquencyPercent ?? 0, creditEffectivenessPercent: row.creditEffectivenessPercent ?? previous.creditEffectivenessPercent ?? 0, challengeEffectivenessPercent: row.challengeEffectivenessPercent ?? previous.challengeEffectivenessPercent ?? 0,
      ticketGoal: row.ticketGoal ?? previous.ticketGoal ?? 0, ticketPercent: row.ticketPercent ?? previous.ticketPercent ?? 0, ticketBonus: row.ticketBonus ?? previous.ticketBonus ?? 0,
      monthlyLoss: row.monthlyLoss ?? previous.monthlyLoss ?? 0, lossSalesPercent: row.lossSalesPercent ?? previous.lossSalesPercent ?? 0, lostGoal: row.lostGoal ?? previous.lostGoal ?? 0, lostReceived: row.lostReceived ?? previous.lostReceived ?? 0, lossEffectivenessPercent: row.lossEffectivenessPercent ?? previous.lossEffectivenessPercent ?? 0,
      amountReceivable: extra?.amountReceivable ?? previous.amountReceivable ?? 0, overdueOpening: extra?.overdueOpening ?? previous.overdueOpening ?? 0, portfolioTotal: extra?.portfolioTotal ?? previous.portfolioTotal ?? 0,
      receiptForecast: extra?.receiptForecast ?? previous.receiptForecast ?? 0, closingForecast: extra?.closingForecast ?? previous.closingForecast ?? 0, closingForecastPercent: extra?.closingForecastPercent ?? previous.closingForecastPercent ?? 0,
      accumulatedLossGoal: extra?.accumulatedLossGoal ?? previous.accumulatedLossGoal ?? 0, accumulatedLossReceived: extra?.accumulatedLossReceived ?? previous.accumulatedLossReceived ?? 0, accumulatedLossBalance: extra?.accumulatedLossBalance ?? previous.accumulatedLossBalance ?? 0,
      previousDayGoal: tracking?.previousDayGoal ?? previous.previousDayGoal ?? 0, dailyReceived: tracking?.received ?? previous.dailyReceived ?? 0, previousDayDifference: tracking?.previousDayDifference ?? previous.previousDayDifference ?? 0, accumulatedDifference: tracking?.accumulatedDifference ?? previous.accumulatedDifference ?? 0, redesignedDailyGoal: tracking?.redesignedDailyGoal ?? previous.redesignedDailyGoal ?? 0,
      challengeDailyReceivedJson: challenge?.dailyReceived ? JSON.stringify(challenge.dailyReceived) : previous.challengeDailyReceivedJson ?? null, sales: receipts?.sales ?? previous.sales ?? 0, receiptDailyJson: receipts?.dailyReceived ? JSON.stringify(receipts.dailyReceived) : previous.receiptDailyJson ?? null, updatedAt: new Date().toISOString(),
    };
    const { error } = await table("matrixMetrics").upsert(values, { onConflict: "branchId" });
    if (error) throw error;
    imported += 1;
  }
  const importedAt = new Date().toISOString();
  const sourceRows: Record<string, any[]> = { analytic, data, dailyTracking, challengeDaily, receiptDaily };
  for (const source of Object.keys(sourceRows)) {
    const rows = sourceRows[source];
    if (!rows.length) continue;
    const { error } = await table("matrixImportSources").upsert({ source, importedAt, receivedRows: (input[source] ?? []).length, validRows: rows.length, updatedAt: importedAt }, { onConflict: "source" });
    if (error) throw error;
  }
  const otherCodes = [...Array.from(dataByCode.keys()), ...Array.from(trackingByCode.keys()), ...Array.from(challengeByCode.keys()), ...Array.from(receiptByCode.keys())];
  return { imported, createdBranches, unmatched: otherCodes.filter(code => !analyticByCode.has(code)).length };
}

async function matrixAutofillForCurrentUser() {
  const { branchId } = await branchForCurrentUser();
  if (!branchId) throw new Error("Nenhuma filial está vinculada ao seu perfil.");
  const { data, error } = await table("matrixMetrics").select("*").eq("branchId", branchId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Não há dados da sua filial na Matriz.");
  return { portfolioTotal: data.portfolioTotal ?? 0, monthOpening: data.overdueOpening ?? 0, dayOpening: data.overdueOpening ?? 0, currentOverdue: data.received ?? 0, creditGoal: data.creditGoal ?? 0, challengeGoal: data.challengeGoal ?? 0, lostGoal: data.lostGoal ?? 0, lostReceived: data.lostReceived ?? 0 };
}

async function invokeCredentialFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-user-credentials", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function dispatchQuery(path: string[], input: unknown) {
  const key = path.join(".");
  switch (key) {
    case "profile.mine": return profileMine();
    case "metrics.mine": return metricsMine();
    case "subscription.mine": return subscriptionMine();
    case "appTexts.get": case "maintenance.get": { const { data, error } = await table(key === "appTexts.get" ? "appTextSettings" : "maintenanceSettings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; }
    case "profile.branches": { const { data, error } = await table("branches").select("*").eq("isActive", true).order("name"); if (error) throw error; return data ?? []; }
    case "utilities.downloads": case "utilities.reports": { const name = key.endsWith("downloads") ? "utilityDownloads" : "utilityReports"; const { data, error } = await table(name).select("*").order(key.endsWith("downloads") ? "title" : "createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "updates.list": case "updatesAdmin.list": { const { data, error } = await table("updateNotes").select("*").order("createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "matrix.mine": case "matrix.overview": { const { data, error } = await table("matrixMetrics").select("*, branches(*)").order("branchId"); if (error) throw error; const items = (data ?? []).map((row: any) => ({ branch: row.branches, metrics: row, updatedAt: row.updatedAt })); if (key.endsWith("overview")) return items; const { branchId } = await branchForCurrentUser(); return { metrics: items.find(item => item.metrics.branchId === branchId)?.metrics ?? null }; }
    case "matrix.importStatus": case "admin.importStatus": { const { data, error } = await table("matrixImportSources").select("*").order("importedAt", { ascending: false }); if (error) throw error; return key.startsWith("admin.") ? { lastImportedAt: data?.[0]?.importedAt ?? null, sources: data ?? [] } : data ?? []; }
    case "admin.branches": { const { data, error } = await table("branches").select("*").order("name"); if (error) throw error; return data ?? []; }
    case "admin.users": { const [{ data: users, error: usersError }, { data: profiles, error: profilesError }, { data: branches, error: branchesError }] = await Promise.all([table("users").select("*"), table("userProfiles").select("*"), table("branches").select("*")]); if (usersError) throw usersError; if (profilesError) throw profilesError; if (branchesError) throw branchesError; return (profiles ?? []).map((profile: any) => ({ profile, account: (users ?? []).find((item: any) => item.id === profile.userId) ?? null, branch: (branches ?? []).find((item: any) => item.id === profile.branchId) ?? { id: profile.branchId, name: "Filial", code: null, regional: null } })); }
    case "branches.overview": { const [{ data: branches, error: branchesError }, { data: profiles, error: profilesError }, { data: metrics, error: metricsError }] = await Promise.all([table("branches").select("*").order("name"), table("userProfiles").select("*"), table("branchMetrics").select("*")]); if (branchesError) throw branchesError; if (profilesError) throw profilesError; if (metricsError) throw metricsError; return (branches ?? []).map((branch: any) => ({ branch, operator: (profiles ?? []).find((item: any) => item.branchId === branch.id) ?? null, metrics: (metrics ?? []).find((item: any) => item.branchId === branch.id) ?? {}, updatedAt: branch.updatedAt })); }
    case "history.list": { const month = (input as { month?: string } | undefined)?.month; const user = await currentUser(); const { data: profile } = user ? await table("userProfiles").select("branchId").eq("userId", user.id).maybeSingle() : { data: null }; let query = table("receiptHistoryEntries").select("*").order("entryDate", { ascending: false }); if (profile?.branchId) query = query.eq("branchId", profile.branchId); if (month) query = query.gte("entryDate", `${month}-01`).lt("entryDate", `${month}-32`); const { data, error } = await query; if (error) throw error; const entries = data ?? []; const totalReceived = entries.reduce((sum: number, entry: any) => sum + Number(entry.receivedAmount ?? 0), 0); const first = entries[0] as any; return { month, entries, totalReceived, daysRecorded: entries.length, averagePerDay: entries.length ? totalReceived / entries.length : 0, indicators: first ? { monthOpening: first.monthOpening ?? 0, creditGoal: first.creditGoal ?? 0, challengeGoal: first.challengeGoal ?? 0, currentOverdue: first.currentOverdue ?? 0, delinquencyPercent: first.delinquencyPercent ?? 0, previousMonthDifference: first.previousMonthDifference ?? 0 } : null }; }
    case "history.dailyStatus": { const { branchId } = await branchForCurrentUser(); const date = (input as any)?.entryDate; const { data } = branchId ? await table("receiptHistoryEntries").select("id").eq("branchId", branchId).eq("entryDate", date).maybeSingle() : { data: null }; return { hasBranch: Boolean(branchId), hasEntry: Boolean(data), entryDate: date }; }
    case "chat.supportRecipient": { const { data, error } = await table("users").select("id,name,role,supportAvailability").eq("role", "admin").limit(1).maybeSingle(); if (error) throw error; return data; }
    case "chat.general": case "chat.private": case "chat.privateThreads": { const { data, error } = await table("chatMessages").select("*").order("createdAt"); if (error) throw error; return data ?? []; }
    case "chat.unreadCount": case "updates.unreadCount": return 0;
    case "chat.mySupportAvailability": { const user = await currentUser(); return user?.supportAvailability ?? "available"; }
    case "romaneio.parties": case "romaneio.products": { const name = key.endsWith("parties") ? "romaneioParties" : "romaneioProducts"; const { data, error } = await table(name).select("*").order(name === "romaneioParties" ? "name" : "description"); if (error) throw error; return data ?? []; }
    case "romaneio.list": { const user = await currentUser(); const { data, error } = await table("romaneios").select("*").eq("createdByUserId", user?.id ?? 0).order("createdAt", { ascending: false }); if (error) throw error; return data ?? []; }
    case "romaneio.get": { const id = (input as any)?.id ?? 0; const { data, error } = await table("romaneios").select("*, romaneioItems(*), romaneioActivities(*)").eq("id", id).maybeSingle(); if (error) throw error; return data; }
    case "subscriptionAdmin.settings": { const { data, error } = await table("subscriptionSettings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; }
    default: return null;
  }
}

async function dispatchMutation(path: string[], input: any) {
  const key = path.join(".");
  const user = await currentUser();
  switch (key) {
    case "admin.importAnalytics": return importMatrixWorkbook(input);
    case "metrics.autofillFromMatrix": return matrixAutofillForCurrentUser();
    case "admin.updateUserCredentials": return invokeCredentialFunction({ action: "updateUserCredentials", ...input });
    case "admin.createLocalUser": return invokeCredentialFunction({ action: "createLocalUser", ...input });
    case "adminAuth.updateCredentials": return invokeCredentialFunction({ action: "updateAdminCredentials", username: input.username, newPassword: input.newPassword });
    case "profile.account": { const { error } = await table("userProfiles").update({ fullName: input.fullName, phone: input.phone, instagram: input.instagram }).eq("userId", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "profile.preferences": { const { error } = await table("userProfiles").update(input).eq("userId", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "profile.presence": { const { error } = await table("users").update({ lastSignedIn: new Date().toISOString() }).eq("id", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "metrics.save": { const { data, error } = await table("metricSettings").upsert({ ...input, userId: user?.id }, { onConflict: "userId" }).select().single(); if (error) throw error; return data; }
    case "history.create": { const branchId = input.branchId ?? (await profileMine())?.profile?.branchId; if (!branchId) throw new Error("Nenhuma filial está vinculada ao seu perfil."); const { data: existing } = await table("receiptHistoryEntries").select("id").eq("branchId", branchId).eq("entryDate", input.entryDate).maybeSingle(); if (existing) throw new Error("Já existe um lançamento para esta data. Edite o lançamento existente."); const { data, error } = await table("receiptHistoryEntries").insert({ ...input, branchId, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "history.update": { const payload = input.data ?? input; const { data: current } = await table("receiptHistoryEntries").select("branchId").eq("id", input.id).maybeSingle(); const { data, error } = await table("receiptHistoryEntries").update({ entryDate: payload.entryDate, receivedAmount: payload.receivedAmount, monthOpening: payload.monthOpening, creditGoal: payload.creditGoal, challengeGoal: payload.challengeGoal, currentOverdue: payload.currentOverdue, delinquencyPercent: payload.delinquencyPercent, previousMonthDifference: payload.previousMonthDifference, updatedAt: new Date().toISOString() }).eq("id", input.id).eq("branchId", current?.branchId ?? 0).select().single(); if (error) throw error; return data; }
    case "history.importFromMatrix": { const month = input.month as string; const { branchId } = await branchForCurrentUser(); if (!branchId) throw new Error("Nenhuma filial está vinculada ao seu perfil."); const { data: matrix, error: matrixError } = await table("matrixMetrics").select("receiptDailyJson,overdueOpening,creditGoal,challengeGoal,received,delinquencyPercent").eq("branchId", branchId).maybeSingle(); if (matrixError) throw matrixError; const daily = matrix?.receiptDailyJson ? JSON.parse(matrix.receiptDailyJson) : []; let created = 0; let updated = 0; for (let index = 0; index < (daily as any[]).length; index += 1) { const amount = (daily as any[])[index]; if (amount === null || amount === undefined) continue; const entryDate = `${month}-${String(index + 1).padStart(2, "0")}`; const { data: existing } = await table("receiptHistoryEntries").select("id").eq("branchId", branchId).eq("entryDate", entryDate).maybeSingle(); const payload = { branchId, entryDate, receivedAmount: Number(amount) || 0, monthOpening: matrix?.overdueOpening ?? 0, creditGoal: matrix?.creditGoal ?? 0, challengeGoal: matrix?.challengeGoal ?? 0, currentOverdue: matrix?.received ?? 0, delinquencyPercent: matrix?.delinquencyPercent ?? 0, createdByUserId: user?.id }; if (existing) { await table("receiptHistoryEntries").update(payload).eq("id", existing.id); updated += 1; } else { await table("receiptHistoryEntries").insert(payload); created += 1; } } return { created, updated }; }
    case "history.delete": { const { error } = await table("receiptHistoryEntries").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "appTexts.update": case "maintenance.update": { const name = key.startsWith("appTexts") ? "appTextSettings" : "maintenanceSettings"; const { data, error } = await table(name).update(input).gt("id", 0).select().single(); if (error) throw error; return data; }
    case "profile.complete": { const { error } = await table("userProfiles").upsert({ ...input, userId: user?.id, profileComplete: true }, { onConflict: "userId" }); if (error) throw error; return { success: true }; }
    case "chat.send": { const { data, error } = await table("chatMessages").insert({ ...input, senderUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "chat.markRead": case "updates.markRead": return { success: true };
    case "chat.setSupportAvailability": { const { error } = await table("users").update({ supportAvailability: input.status }).eq("id", user?.id ?? 0); if (error) throw error; return { success: true }; }
    case "admin.setBranchStatus": { const { data, error } = await table("branches").update({ isActive: input.isActive }).eq("id", input.id).select().single(); if (error) throw error; return data; }
    case "admin.createBranch": { const { data, error } = await table("branches").insert({ name: input.name, code: input.code ?? null, isActive: true }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.createDownload": case "utilityAdmin.updateDownload": { const id = input.id; const { data, error } = id ? await table("utilityDownloads").update(input).eq("id", id).select().single() : await table("utilityDownloads").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.createReport": case "utilityAdmin.updateReport": { const id = input.id; const { data, error } = id ? await table("utilityReports").update(input).eq("id", id).select().single() : await table("utilityReports").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "utilityAdmin.deleteDownload": case "utilityAdmin.deleteReport": { const name = key.endsWith("Download") ? "utilityDownloads" : "utilityReports"; const { error } = await table(name).delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "updatesAdmin.create": case "updatesAdmin.update": { const id = input.id; const { data, error } = id ? await table("updateNotes").update(input).eq("id", id).select().single() : await table("updateNotes").insert(input).select().single(); if (error) throw error; return data; }
    case "updatesAdmin.delete": { const { error } = await table("updateNotes").delete().eq("id", input.id); if (error) throw error; return { success: true }; }
    case "romaneio.create": { const { data, error } = await table("romaneios").insert({ ...input, createdByUserId: user?.id }).select().single(); if (error) throw error; return data; }
    case "subscription.createPixPayment": throw new Error("Pagamento Mercado Pago requer uma Edge Function Supabase segura.");
    default: throw new Error(`Operação ainda não migrada: ${key}`);
  }
}

function makeProcedure(path: string[]) {
  return {
    useQuery: (input?: unknown, options?: any): any => useQuery({ ...(options ?? {}), queryKey: ["supabase", ...path, input], queryFn: () => dispatchQuery(path, input) } as any),
    useMutation: (options?: any): any => useMutation({ ...(options ?? {}), mutationFn: (input: unknown) => dispatchMutation(path, input) } as any),
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
