import { and, count, desc, eq, gt, gte, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminCredentials,
  branchMetrics,
  branches,
  chatReadStates,
  chatMessages,
  InsertUser,
  metricSettings,
  receiptHistoryEntries,
  subscriptionProofs,
  subscriptionSettings,
  utilityDownloads,
  utilityReports,
  userProfiles,
  userCredentials,
  users,
} from "../drizzle/schema";
import { randomUUID } from "crypto";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./localAdminAuth";
import { normalizeBranchCode, type AnalyticImportRow, type BranchImportRow } from "../shared/importRules";
import { amountReceivable, receiptAmounts, ticketGoalAmount } from "../shared/goalRules";
import { latestOverviewUpdate, resolveBranchOverviewMetrics } from "../shared/branchOverview";
import { resolveMetricStorageScope } from "../shared/branchMetricScope";
import { applyWorkingDaysMode, type WorkingDaysMode } from "../shared/workingDays";
import { assertOperatorSlotAvailable, deriveBranchSlotAvailability, type OperatorRole } from "../shared/branchSlots";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

type ApplicationDatabase = Exclude<Awaited<ReturnType<typeof getDb>>, null>;

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listActiveBranches(database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
}

export async function getBranchSlotAvailability(branchId: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return { leader: false, assistant: false };
  const occupied = await db
    .select({ operatorType: userProfiles.operatorType })
    .from(userProfiles)
    .where(and(eq(userProfiles.branchId, branchId), eq(userProfiles.profileComplete, true)));
  return deriveBranchSlotAvailability(occupied.map(profile => profile.operatorType));
}

export async function listActiveBranchesWithSlots(database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return [];
  const activeBranches = await listActiveBranches(db);
  const availability = await Promise.all(activeBranches.map(async branch => ({
    branch,
    slots: await getBranchSlotAvailability(branch.id, db),
  })));
  return availability.map(({ branch, slots }) => ({
    ...branch,
    availableSlots: { leader: !slots.leader, assistant: !slots.assistant },
  }));
}

async function assertDatabaseBranchRoleSlotAvailable(
  db: ApplicationDatabase,
  branchId: number,
  operatorType: OperatorRole,
  ignoredProfileId?: number,
) {
  const conditions = [eq(userProfiles.branchId, branchId), eq(userProfiles.operatorType, operatorType), eq(userProfiles.profileComplete, true)];
  if (ignoredProfileId) conditions.push(ne(userProfiles.id, ignoredProfileId));
  const occupied = await db.select({ id: userProfiles.id }).from(userProfiles).where(and(...conditions)).limit(1);
  assertOperatorSlotAvailable(occupied.map(() => operatorType), operatorType);
}

export async function listAllBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(branches.name);
}

export async function listBranchOverviews() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ branch: branches, profile: userProfiles, account: users, branchMetrics })
    .from(branches)
    .leftJoin(userProfiles, and(eq(userProfiles.branchId, branches.id), eq(userProfiles.isActive, true)))
    .leftJoin(users, eq(userProfiles.userId, users.id))
    .leftJoin(branchMetrics, eq(branchMetrics.branchId, branches.id))
    .where(eq(branches.isActive, true))
    .orderBy(branches.name, userProfiles.fullName);

  return rows.map(({ branch, profile, account, branchMetrics: metrics }) => ({
    branch,
    operator: profile
      ? {
          id: profile.id,
          userId: profile.userId,
          fullName: profile.fullName,
          phone: profile.phone,
          instagram: profile.instagram,
          operatorType: profile.operatorType,
          isOnVacation: profile.isOnVacation,
          lastSignedIn: account?.lastSignedIn ?? null,
        }
      : null,
    metrics: resolveBranchOverviewMetrics(metrics),
    updatedAt: latestOverviewUpdate(metrics?.updatedAt, profile?.updatedAt, branch.updatedAt),
  }));
}

export async function createBranch(input: { name: string; code?: string; regional?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const code = normalizeBranchCode(input.code);
  await db.insert(branches).values({ name: input.name, code: code || null, regional: input.regional || null });
}

export async function importBranches(rows: BranchImportRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const allBranches = await db.select().from(branches);
  const byCode = new Map(allBranches.filter(branch => branch.code).map(branch => [normalizeBranchCode(branch.code), branch]));
  const byName = new Map(allBranches.map(branch => [branch.name.toLocaleLowerCase(), branch]));
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = byCode.get(row.code) ?? byName.get(row.name.toLocaleLowerCase());
    if (existing) {
      await db.update(branches).set({ name: row.name, code: row.code, regional: row.regional || null, isActive: true }).where(eq(branches.id, existing.id));
      updated += 1;
    } else {
      await db.insert(branches).values({ name: row.name, code: row.code, regional: row.regional || null, isActive: true });
      created += 1;
    }
  }
  return { created, updated };
}

export async function importAnalyticMetrics(rows: AnalyticImportRow[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const allBranches = await db.select().from(branches);
  const byCode = new Map(allBranches.filter(branch => branch.code).map(branch => [normalizeBranchCode(branch.code), branch]));
  let imported = 0;
  let unmatched = 0;
  for (const row of rows) {
    const branch = byCode.get(row.code);
    if (!branch) { unmatched += 1; continue; }
    const values = {
      creditGoal: row.creditGoal,
      challengeGoal: row.challengeGoal,
      currentOverdue: row.currentOverdue,
      monthlyLoss: row.monthlyLoss,
      lossSalesPercent: row.lossSalesPercent,
      lostGoal: row.lostGoal,
      lostReceived: row.lostReceived,
    };
    await db.insert(branchMetrics).values({ branchId: branch.id, ...values }).onDuplicateKeyUpdate({ set: values });
    if (row.regional) await db.update(branches).set({ regional: row.regional }).where(eq(branches.id, branch.id));
    imported += 1;
  }
  return { imported, unmatched };
}

export async function setBranchStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(branches).set({ isActive }).where(eq(branches.id, id));
}

export async function getMyProfile(userId: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ profile: userProfiles, branch: branches })
    .from(userProfiles)
    .leftJoin(branches, eq(userProfiles.branchId, branches.id))
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0];
}

type ProfileInput = {
  fullName: string;
  email: string;
  branchId: number;
  phone: string;
  instagram?: string | null;
  operatorType: "leader" | "assistant";
};

export async function completeMyProfile(userId: number, input: ProfileInput, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const preRegistered = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.email, input.email), isNull(userProfiles.userId)))
    .limit(1);
  const values = {
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    branchId: input.branchId,
    phone: input.phone,
    instagram: input.instagram || null,
    operatorType: input.operatorType,
    profileComplete: true,
  } as const;
  const targetProfile = existing[0] ?? preRegistered[0];
  await assertDatabaseBranchRoleSlotAvailable(db, input.branchId, input.operatorType, targetProfile?.id);
  if (existing[0]) {
    await db.update(userProfiles).set(values).where(eq(userProfiles.id, existing[0].id));
  } else if (preRegistered[0]) {
    await db.update(userProfiles).set({ ...values, userId }).where(eq(userProfiles.id, preRegistered[0].id));
  } else {
    await db.insert(userProfiles).values({ ...values, userId });
  }
}

export async function updateMyPreferences(
  userId: number,
  input: { colorMode?: "light" | "dark"; colorPalette?: "ocean" | "violet" | "forest" | "sunset"; showLostGoal?: boolean; isOnVacation?: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [profile] = await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (profile) {
    await db.update(userProfiles).set(input).where(eq(userProfiles.id, profile.id));
    return;
  }

  const [account] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new Error("Usuário não encontrado");
  await db.insert(userProfiles).values({
    userId,
    email: account.email ?? `admin-${userId}@meufiado.local`,
    fullName: account.name ?? "Administrador",
    profileComplete: false,
    isActive: true,
    ...input,
  });
}

type AccountUpdateInput = {
  fullName: string;
  phone: string;
  instagram?: string | null;
};

async function ensurePersonalProfile(db: ApplicationDatabase, userId: number, details?: Partial<AccountUpdateInput>) {
  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing) return existing;
  const [account] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new Error("Usuário não encontrado");
  const values = {
    userId,
    email: account.email ?? `conta-${userId}@meufiado.local`,
    fullName: details?.fullName ?? account.name ?? "Usuário",
    phone: details?.phone ?? null,
    instagram: details?.instagram ?? null,
    profileComplete: false,
    isActive: true,
  };
  await db.insert(userProfiles).values(values);
  const [created] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!created) throw new Error("Não foi possível criar o perfil");
  return created;
}

export async function updateMyAccount(userId: number, input: AccountUpdateInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensurePersonalProfile(db, userId, input);
  const values = { fullName: input.fullName, phone: input.phone, instagram: input.instagram || null };
  await Promise.all([
    db.update(userProfiles).set(values).where(eq(userProfiles.id, profile.id)),
    db.update(users).set({ name: input.fullName }).where(eq(users.id, userId)),
  ]);
  return getMyProfile(userId, db);
}

export async function uploadMyAvatar(userId: number, dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Envie uma imagem JPG, PNG ou WEBP válida.");
  const contentType = match[1];
  const binary = Buffer.from(match[2], "base64");
  if (binary.length === 0 || binary.length > 2 * 1024 * 1024) throw new Error("A foto deve ter no máximo 2 MB.");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const uploaded = await storagePut(`profile-avatars/${userId}/foto.${extension}`, binary, contentType);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensurePersonalProfile(db, userId);
  await db.update(userProfiles).set({ avatarUrl: uploaded.url }).where(eq(userProfiles.id, profile.id));
  return { avatarUrl: uploaded.url };
}

const emptyMetrics = {
  portfolioTotal: 0,
  monthOpening: 0,
  dayOpening: 0,
  currentOverdue: 0,
  creditGoal: 0,
  challengeGoal: 0,
  lostGoal: 0,
  lostReceived: 0,
  workingDaysMode: "automatic" as WorkingDaysMode,
  workingDaysTotal: 0,
  workingDaysElapsed: 0,
  ticketWorkingDaysRemaining: 0,
  fiadoAtDay15: false,
};

export async function getMyMetrics(userId: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return emptyMetrics;
  const profile = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const storageScope = resolveMetricStorageScope(userId, profile[0]?.branchId);
  if (storageScope.type === "branch") {
    const sharedMetrics = await db.select().from(branchMetrics).where(eq(branchMetrics.branchId, storageScope.branchId)).limit(1);
    return applyWorkingDaysMode(sharedMetrics[0] ?? emptyMetrics);
  }
  const legacyMetrics = await db.select().from(metricSettings).where(eq(metricSettings.userId, userId)).limit(1);
  return applyWorkingDaysMode(legacyMetrics[0] ?? emptyMetrics);
}

export async function saveMyMetrics(userId: number, input: typeof emptyMetrics, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const normalizedInput = applyWorkingDaysMode(input);
  const profile = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const dayInBrazil = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", day: "numeric" }).format(new Date()));
  const received = receiptAmounts(normalizedInput.monthOpening, normalizedInput.dayOpening, normalizedInput.currentOverdue).accumulated;
  const reachedBeforeDeadline = dayInBrazil <= 15 && received >= ticketGoalAmount(amountReceivable(normalizedInput.monthOpening, normalizedInput.creditGoal));
  const storageScope = resolveMetricStorageScope(userId, profile[0]?.branchId);
  if (storageScope.type === "branch") {
    const existing = await db.select({ fiadoAtDay15: branchMetrics.fiadoAtDay15 }).from(branchMetrics).where(eq(branchMetrics.branchId, storageScope.branchId)).limit(1);
    const values = { ...normalizedInput, fiadoAtDay15: Boolean(existing[0]?.fiadoAtDay15 || reachedBeforeDeadline) };
    await db.insert(branchMetrics).values({ branchId: storageScope.branchId, ...values }).onDuplicateKeyUpdate({ set: values });
    return;
  }
  const existing = await db.select({ fiadoAtDay15: metricSettings.fiadoAtDay15 }).from(metricSettings).where(eq(metricSettings.userId, userId)).limit(1);
  const values = { ...normalizedInput, fiadoAtDay15: Boolean(existing[0]?.fiadoAtDay15 || reachedBeforeDeadline) };
  await db.insert(metricSettings).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
}

export type ReceiptHistoryInput = {
  entryDate: string;
  receivedAmount: number;
};

function assertCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe uma data válida.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Informe uma data válida.");
  }
  return value;
}

function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Informe um mês válido.");
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return { start: `${month}-01`, end: next.toISOString().slice(0, 10) };
}

async function getHistoryBranchId(db: ApplicationDatabase, userId: number) {
  const [profile] = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!profile?.branchId) throw new Error("Vincule uma filial ao seu perfil para registrar históricos.");
  return profile.branchId;
}

async function getHistoryEntryForBranch(db: ApplicationDatabase, id: number, branchId: number) {
  const [entry] = await db
    .select()
    .from(receiptHistoryEntries)
    .where(and(eq(receiptHistoryEntries.id, id), eq(receiptHistoryEntries.branchId, branchId)))
    .limit(1);
  if (!entry) throw new Error("Lançamento não encontrado nesta filial.");
  return entry;
}

export async function listReceiptHistory(userId: number, month: string, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return { month, entries: [], totalReceived: 0, daysRecorded: 0, averagePerDay: 0 };
  const branchId = await getHistoryBranchId(db, userId);
  const { start, end } = monthBounds(month);
  const entries = await db
    .select()
    .from(receiptHistoryEntries)
    .where(and(
      eq(receiptHistoryEntries.branchId, branchId),
      gte(receiptHistoryEntries.entryDate, start),
      lt(receiptHistoryEntries.entryDate, end),
    ))
    .orderBy(desc(receiptHistoryEntries.entryDate));
  const totalReceived = entries.reduce((total, entry) => total + entry.receivedAmount, 0);
  return {
    month,
    entries,
    totalReceived,
    daysRecorded: entries.length,
    averagePerDay: entries.length ? totalReceived / entries.length : 0,
  };
}

export async function createReceiptHistoryEntry(userId: number, input: ReceiptHistoryInput, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const branchId = await getHistoryBranchId(db, userId);
  const entryDate = assertCalendarDate(input.entryDate);
  const [existing] = await db
    .select({ id: receiptHistoryEntries.id })
    .from(receiptHistoryEntries)
    .where(and(eq(receiptHistoryEntries.branchId, branchId), eq(receiptHistoryEntries.entryDate, entryDate)))
    .limit(1);
  if (existing) throw new Error("Já existe um lançamento para esta data. Edite o lançamento existente.");
  await db.insert(receiptHistoryEntries).values({ branchId, entryDate, receivedAmount: input.receivedAmount, createdByUserId: userId });
}

export async function updateReceiptHistoryEntry(userId: number, id: number, input: ReceiptHistoryInput, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const branchId = await getHistoryBranchId(db, userId);
  await getHistoryEntryForBranch(db, id, branchId);
  const entryDate = assertCalendarDate(input.entryDate);
  const [sameDayEntry] = await db
    .select({ id: receiptHistoryEntries.id })
    .from(receiptHistoryEntries)
    .where(and(eq(receiptHistoryEntries.branchId, branchId), eq(receiptHistoryEntries.entryDate, entryDate)))
    .limit(1);
  if (sameDayEntry && sameDayEntry.id !== id) throw new Error("Já existe um lançamento para esta data. Escolha outra data.");
  await db.update(receiptHistoryEntries).set({ entryDate, receivedAmount: input.receivedAmount }).where(eq(receiptHistoryEntries.id, id));
}

export async function deleteReceiptHistoryEntry(userId: number, id: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const branchId = await getHistoryBranchId(db, userId);
  await getHistoryEntryForBranch(db, id, branchId);
  await db.delete(receiptHistoryEntries).where(eq(receiptHistoryEntries.id, id));
}

export const subscriptionFeatureKeys = ["branches", "history", "utilities", "chat"] as const;
export type SubscriptionFeatureKey = typeof subscriptionFeatureKeys[number];
export type SubscriptionPlan = "free" | "pro";
export type SubscriptionSettingsInput = {
  monthlyPrice: number;
  pixKey: string;
  branchesPlan: SubscriptionPlan;
  historyPlan: SubscriptionPlan;
  utilitiesPlan: SubscriptionPlan;
  chatPlan: SubscriptionPlan;
};

const defaultSubscriptionSettings: SubscriptionSettingsInput = {
  monthlyPrice: 0,
  pixKey: "",
  branchesPlan: "pro",
  historyPlan: "pro",
  utilitiesPlan: "pro",
  chatPlan: "pro",
};

export async function getSubscriptionSettings(database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return { id: 0, ...defaultSubscriptionSettings };
  const [current] = await db.select().from(subscriptionSettings).orderBy(desc(subscriptionSettings.id)).limit(1);
  if (current) return current;
  await db.insert(subscriptionSettings).values(defaultSubscriptionSettings);
  const [created] = await db.select().from(subscriptionSettings).orderBy(desc(subscriptionSettings.id)).limit(1);
  return created ?? { id: 0, ...defaultSubscriptionSettings };
}

export async function updateSubscriptionSettings(input: SubscriptionSettingsInput, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = await getSubscriptionSettings(db);
  const values = { ...input, updatedByUserId: actorUserId };
  if (current.id) await db.update(subscriptionSettings).set(values).where(eq(subscriptionSettings.id, current.id));
  else await db.insert(subscriptionSettings).values(values);
  return getSubscriptionSettings(db);
}

function hasActiveProPlan(account: { plan: SubscriptionPlan; proExpiresAt: Date | null }) {
  return account.plan === "pro" && (!account.proExpiresAt || account.proExpiresAt.getTime() > Date.now());
}

export async function getMySubscription(userId: number) {
  const db = await getDb();
  const settings = await getSubscriptionSettings(db ?? undefined);
  if (!db) return { plan: "free" as const, isPro: false, proExpiresAt: null, settings, latestProof: null };
  const [account] = await db.select({ plan: users.plan, proExpiresAt: users.proExpiresAt }).from(users).where(eq(users.id, userId)).limit(1);
  const [latestProof] = await db.select().from(subscriptionProofs).where(eq(subscriptionProofs.userId, userId)).orderBy(desc(subscriptionProofs.createdAt)).limit(1);
  const plan = (account?.plan ?? "free") as SubscriptionPlan;
  const isPro = hasActiveProPlan({ plan, proExpiresAt: account?.proExpiresAt ?? null });
  return { plan, isPro, proExpiresAt: account?.proExpiresAt ?? null, settings, latestProof: latestProof ?? null };
}

export async function canAccessSubscriptionFeature(userId: number, role: "admin" | "user", feature: SubscriptionFeatureKey) {
  if (role === "admin") return true;
  const subscription = await getMySubscription(userId);
  const settingKey = `${feature}Plan` as const;
  return subscription.isPro || subscription.settings[settingKey] === "free";
}

export async function setManagedUserPlan(userId: number, plan: SubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const proExpiresAt = plan === "pro" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
  await db.update(users).set({ plan, proExpiresAt }).where(eq(users.id, userId));
}

export async function submitSubscriptionProof(userId: number, dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Envie um comprovante em JPG, PNG ou WEBP.");
  const contentType = match[1];
  const binary = Buffer.from(match[2], "base64");
  if (binary.length === 0 || binary.length > 3 * 1024 * 1024) throw new Error("O comprovante deve ter no máximo 3 MB.");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const uploaded = await storagePut(`subscription-proofs/${userId}/${randomUUID()}.${extension}`, binary, contentType);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(subscriptionProofs).values({ userId, proofUrl: uploaded.url, status: "pending" });
  return { proofUrl: uploaded.url };
}

export async function listSubscriptionProofs() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ proof: subscriptionProofs, account: users, profile: userProfiles })
    .from(subscriptionProofs)
    .innerJoin(users, eq(subscriptionProofs.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .orderBy(desc(subscriptionProofs.createdAt));
}

export async function reviewSubscriptionProof(proofId: number, status: "approved" | "rejected", reviewNote: string | null, reviewerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [proof] = await db.select().from(subscriptionProofs).where(eq(subscriptionProofs.id, proofId)).limit(1);
  if (!proof) throw new Error("Comprovante não encontrado.");
  await db.update(subscriptionProofs).set({ status, reviewNote, reviewedByUserId: reviewerUserId, reviewedAt: new Date() }).where(eq(subscriptionProofs.id, proofId));
  if (status === "approved") await db.update(users).set({ plan: "pro", proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }).where(eq(users.id, proof.userId));
}

export async function listManagedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ profile: userProfiles, branch: branches, account: users })
    .from(userProfiles)
    .innerJoin(branches, eq(userProfiles.branchId, branches.id))
    .leftJoin(users, eq(userProfiles.userId, users.id))
    .orderBy(desc(userProfiles.updatedAt));
}

export async function deleteManagedUser(profileId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, profileId)).limit(1);
  if (!profile) throw new Error("Usuário não encontrado.");
  if (profile.userId === actorUserId) throw new Error("Use seu próprio acesso para alterar a sua conta.");
  if (profile.userId) {
    await db.delete(chatMessages).where(or(eq(chatMessages.senderUserId, profile.userId), eq(chatMessages.recipientUserId, profile.userId)));
    await db.delete(userCredentials).where(eq(userCredentials.userId, profile.userId));
    await db.delete(adminCredentials).where(eq(adminCredentials.userId, profile.userId));
    await db.delete(metricSettings).where(eq(metricSettings.userId, profile.userId));
    await db.delete(chatReadStates).where(eq(chatReadStates.userId, profile.userId));
    await db.update(receiptHistoryEntries).set({ createdByUserId: null }).where(eq(receiptHistoryEntries.createdByUserId, profile.userId));
    await db.update(subscriptionProofs).set({ reviewedByUserId: null }).where(eq(subscriptionProofs.reviewedByUserId, profile.userId));
    await db.delete(subscriptionProofs).where(eq(subscriptionProofs.userId, profile.userId));
    await db.update(utilityDownloads).set({ createdByUserId: null }).where(eq(utilityDownloads.createdByUserId, profile.userId));
    await db.update(utilityReports).set({ createdByUserId: null }).where(eq(utilityReports.createdByUserId, profile.userId));
  }
  await db.delete(userProfiles).where(eq(userProfiles.id, profileId));
  if (profile.userId) await db.delete(users).where(eq(users.id, profile.userId));
}

export async function listChatMessages(userId: number, recipientUserId?: number | null) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const visibility = recipientUserId
    ? or(
        and(eq(chatMessages.senderUserId, userId), eq(chatMessages.recipientUserId, recipientUserId)),
        and(eq(chatMessages.senderUserId, recipientUserId), eq(chatMessages.recipientUserId, userId)),
      )
    : isNull(chatMessages.recipientUserId);
  return db
    .select({ message: chatMessages, sender: users.name, senderId: users.id, senderRole: users.role })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderUserId, users.id))
    .where(and(gt(chatMessages.expiresAt, now), visibility))
    .orderBy(chatMessages.createdAt);
}

export async function listPrivateChatThreads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const messages = await db
    .select({ message: chatMessages })
    .from(chatMessages)
    .where(and(
      gt(chatMessages.expiresAt, new Date()),
      or(eq(chatMessages.senderUserId, userId), eq(chatMessages.recipientUserId, userId)),
    ))
    .orderBy(desc(chatMessages.createdAt));
  const latestByPartner = new Map<number, typeof messages[number]["message"]>();
  for (const { message } of messages) {
    if (!message.recipientUserId) continue;
    const partnerId = message.senderUserId === userId ? message.recipientUserId : message.senderUserId;
    if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, message);
  }
  const partnerIds = Array.from(latestByPartner.keys());
  if (!partnerIds.length) return [];
  const partners = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, partnerIds));
  const partnersById = new Map(partners.map(partner => [partner.id, partner]));
  return partnerIds
    .map(partnerId => {
      const partner = partnersById.get(partnerId);
      const latestMessage = latestByPartner.get(partnerId);
      if (!partner || !latestMessage) return null;
      return { recipientUserId: partner.id, recipientName: partner.name ?? "Usuário", recipientRole: partner.role, lastMessageBody: latestMessage.body, lastMessageAt: latestMessage.createdAt };
    })
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread));
}

export async function sendChatMessage(input: { senderUserId: number; recipientUserId?: number | null; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const body = input.body.trim();
  if (!body) throw new Error("A mensagem não pode estar vazia.");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(chatMessages).values({ senderUserId: input.senderUserId, recipientUserId: input.recipientUserId ?? null, body, expiresAt });
}

export async function deleteExpiredChatMessages() {
  const db = await getDb();
  if (!db) return { deleted: 0 };
  const result = await db.delete(chatMessages).where(lt(chatMessages.expiresAt, new Date()));
  return { deleted: result[0]?.affectedRows ?? 0 };
}

export async function markChatMessagesRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  const [latestMessage] = await db.select({ id: chatMessages.id }).from(chatMessages).orderBy(desc(chatMessages.id)).limit(1);
  const lastReadMessageId = latestMessage?.id ?? 0;
  await db.insert(chatReadStates).values({ userId, lastReadMessageId }).onDuplicateKeyUpdate({ set: { lastReadMessageId } });
}

export async function countUnreadChatMessages(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [readState] = await db.select({ lastReadMessageId: chatReadStates.lastReadMessageId }).from(chatReadStates).where(eq(chatReadStates.userId, userId)).limit(1);
  const lastReadMessageId = readState?.lastReadMessageId ?? 0;
  const [result] = await db
    .select({ total: count() })
    .from(chatMessages)
    .where(and(
      gt(chatMessages.id, lastReadMessageId),
      gt(chatMessages.expiresAt, new Date()),
      ne(chatMessages.senderUserId, userId),
      or(isNull(chatMessages.recipientUserId), eq(chatMessages.recipientUserId, userId)),
    ));
  return Number(result?.total ?? 0);
}

export type UtilityDownloadInput = {
  title: string;
  fileType: string;
  externalUrl: string;
  isPinned: boolean;
  isVisible: boolean;
};

export type UtilityReportInput = {
  title: string;
  description: string;
  isVisible: boolean;
};

export async function listUtilityDownloads(includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  const ordering = [desc(utilityDownloads.isPinned), desc(utilityDownloads.updatedAt)];
  if (includeHidden) return db.select().from(utilityDownloads).orderBy(...ordering);
  return db.select().from(utilityDownloads).where(eq(utilityDownloads.isVisible, true)).orderBy(...ordering);
}

export async function createUtilityDownload(input: UtilityDownloadInput, createdByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(utilityDownloads).values({ ...input, createdByUserId });
}

export async function updateUtilityDownload(id: number, input: UtilityDownloadInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(utilityDownloads).set(input).where(eq(utilityDownloads.id, id));
}

export async function deleteUtilityDownload(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(utilityDownloads).where(eq(utilityDownloads.id, id));
}

export async function listUtilityReports(includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeHidden) return db.select().from(utilityReports).orderBy(desc(utilityReports.updatedAt));
  return db.select().from(utilityReports).where(eq(utilityReports.isVisible, true)).orderBy(desc(utilityReports.updatedAt));
}

export async function createUtilityReport(input: UtilityReportInput, createdByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(utilityReports).values({ ...input, createdByUserId });
}

export async function updateUtilityReport(id: number, input: UtilityReportInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(utilityReports).set(input).where(eq(utilityReports.id, id));
}

export async function deleteUtilityReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(utilityReports).where(eq(utilityReports.id, id));
}

export async function createPreRegisteredUser(input: ProfileInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email.toLowerCase();
  const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (existingProfile[0]?.userId) throw new Error("Já existe uma conta vinculada a este e-mail.");
  await assertDatabaseBranchRoleSlotAvailable(db, input.branchId, input.operatorType, existingProfile[0]?.id);
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId = existingUser[0]?.id;
  if (!userId) {
    await db.insert(users).values({ openId: `pending-google-${randomUUID()}`, name: input.fullName, email, loginMethod: "google", role: "user", lastSignedIn: new Date() });
    const created = await db.select().from(users).where(eq(users.email, email)).limit(1);
    userId = created[0]?.id;
  }
  if (!userId) throw new Error("Não foi possível criar a conta do operador.");
  const profileValues = { fullName: input.fullName, email, branchId: input.branchId, phone: input.phone, instagram: input.instagram || null, operatorType: input.operatorType, profileComplete: true } as const;
  if (existingProfile[0]) await db.update(userProfiles).set({ ...profileValues, userId }).where(eq(userProfiles.id, existingProfile[0].id));
  else await db.insert(userProfiles).values({ ...profileValues, userId });
}

export async function loginGoogleOperator(
  input: { subject: string; email: string; name?: string | null },
  database?: ApplicationDatabase,
  options: { createIfMissing?: boolean } = {},
) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email.trim().toLowerCase();
  const googleOpenId = `google-${input.subject}`;
  const [linkedAccount] = await db.select().from(users).where(eq(users.openId, googleOpenId)).limit(1);
  const [emailAccount] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const account = linkedAccount ?? emailAccount;

  if (linkedAccount && emailAccount && linkedAccount.id !== emailAccount.id) return null;

  if (!account) {
    if (!options.createIfMissing) return null;
    await db.insert(users).values({
      openId: googleOpenId,
      name: input.name || "Operador",
      email,
      loginMethod: "google",
      role: "user",
      lastSignedIn: new Date(),
    });
    const [createdAccount] = await db.select().from(users).where(eq(users.openId, googleOpenId)).limit(1);
    if (!createdAccount) return null;
    await db.insert(userProfiles).values({
      userId: createdAccount.id,
      email,
      fullName: input.name || "Operador",
      profileComplete: false,
      isActive: true,
    });
    return createdAccount;
  }

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, account.id)).limit(1);
  if (profile && !profile.isActive) return null;

  const nextName = input.name || account.name || "Operador";
  await db.update(users).set({ openId: googleOpenId, email, name: nextName, loginMethod: "google", lastSignedIn: new Date() }).where(eq(users.id, account.id));
  return { ...account, openId: googleOpenId, email, name: nextName, loginMethod: "google" };
}

export async function loginLocalUser(emailInput: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = emailInput.trim().toLowerCase();
  const result = await db
    .select({ user: users, credential: userCredentials, profile: userProfiles })
    .from(userCredentials)
    .innerJoin(users, eq(userCredentials.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.email, email))
    .limit(1);
  const account = result[0];
  if (!account || !account.profile?.isActive || !(await verifyPassword(password, account.credential.passwordHash))) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, account.user.id));
  return account.user;
}

export async function getUserCredentialStatus(userId: number) {
  const db = await getDb();
  if (!db) return { hasPassword: false, mustChangePassword: false };
  const credential = await db.select().from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1);
  return { hasPassword: Boolean(credential[0]), mustChangePassword: credential[0]?.mustChangePassword ?? false };
}

export async function changeMyPassword(userId: number, currentPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const credential = await db.select().from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1);
  if (!credential[0] || !(await verifyPassword(currentPassword, credential[0].passwordHash))) throw new Error("Senha atual inválida.");
  await db.update(userCredentials).set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false }).where(eq(userCredentials.id, credential[0].id));
}

export async function updateManagedUser(
  id: number,
  input: Partial<Pick<typeof userProfiles.$inferInsert, "isActive" | "isOnVacation" | "operatorType" | "branchId">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const current = await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1);
  if (!current[0]) throw new Error("Usuário não encontrado.");
  const branchId = input.branchId ?? current[0].branchId;
  const operatorType = input.operatorType ?? current[0].operatorType;
  if (branchId) await assertDatabaseBranchRoleSlotAvailable(db, branchId, operatorType, id);
  await db.update(userProfiles).set(input).where(eq(userProfiles.id, id));
}

export async function updateAccountRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

async function ensureLocalAdmin() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existingCredential = await db.select().from(adminCredentials).limit(1);
  if (existingCredential[0]) return existingCredential[0];
  const existingUser = await db.select().from(users).where(eq(users.openId, "local-admin-account")).limit(1);
  let userId = existingUser[0]?.id;
  if (!userId) {
    await db.insert(users).values({
      openId: "local-admin-account",
      name: "Administrador",
      email: "admin@local.invalid",
      loginMethod: "password",
      role: "admin",
      lastSignedIn: new Date(),
    });
    const createdUser = await db.select().from(users).where(eq(users.openId, "local-admin-account")).limit(1);
    userId = createdUser[0]?.id;
  }
  if (!userId) throw new Error("Não foi possível preparar o acesso administrativo.");
  await db.insert(adminCredentials).values({ userId, username: "admin", passwordHash: await hashPassword("admin") });
  const credential = await db.select().from(adminCredentials).where(eq(adminCredentials.userId, userId)).limit(1);
  if (!credential[0]) throw new Error("Não foi possível preparar a credencial administrativa.");
  return credential[0];
}

export async function loginLocalAdmin(username: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const credential = await ensureLocalAdmin();
  if (credential.username.toLowerCase() !== username.trim().toLowerCase()) return null;
  if (!(await verifyPassword(password, credential.passwordHash))) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, credential.userId));
  return getUserById(credential.userId);
}

export async function updateLocalAdminCredentials(input: { username: string; newPassword?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const credential = await ensureLocalAdmin();
  const values: { username: string; passwordHash?: string } = { username: input.username.trim() };
  if (input.newPassword) values.passwordHash = await hashPassword(input.newPassword);
  await db.update(adminCredentials).set(values).where(eq(adminCredentials.id, credential.id));
}
