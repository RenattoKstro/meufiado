import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  adminCredentials,
  appTextSettings,
  branchMetrics,
  branches,
  chatReadStates,
  chatMessages,
  InsertUser,
  matrixImportSources,
  matrixMetrics,
  maintenanceSettings,
  mercadoPagoPixPayments,
  mercadoPagoSubscriptionPayments,
  mercadoPagoSubscriptions,
  metricSettings,
  receiptHistoryEntries,
  romaneioActivities,
  romaneioItems,
  romaneioParties,
  romaneioProducts,
  romaneios,
  subscriptionProofs,
  subscriptionSettings,
  supportConversations,
  updateNotes,
  updateReadStates,
  utilityDownloads,
  utilityReports,
  userProfiles,
  userCredentials,
  users,
} from "../drizzle/schema";
import { randomUUID } from "crypto";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./localAdminAuth";
import {
  normalizeBranchCode,
  type AnalyticImportRow,
  type BranchImportRow,
  type ChallengeDailyImportRow,
  type DailyTrackingImportRow,
  type DataImportRow,
  type ReceiptDailyImportRow,
} from "../shared/importRules";
import { amountReceivable, matrixReceivedAmount, receiptAmounts, ticketGoalAmount } from "../shared/goalRules";
import { latestOverviewUpdate, resolveBranchOverviewMetrics } from "../shared/branchOverview";
import { resolveMetricStorageScope } from "../shared/branchMetricScope";
import { applyWorkingDaysMode, type WorkingDaysMode } from "../shared/workingDays";
import { assertOperatorSlotAvailable, deriveBranchSlotAvailability, type OperatorRole } from "../shared/branchSlots";
import { resolveSubscriptionAccess, SUBSCRIPTION_GRACE_DAYS } from "../shared/subscriptionAccess";
import { storagePut } from "./storage";
import { resolveSupabaseConnectionString } from "./dbConnection";
import { createMercadoPagoPixPayment, getMercadoPagoPayment } from "./mercadoPago";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  const connectionString = resolveSupabaseConnectionString();
  if (!_db && connectionString) {
    try {
      _pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
      _db = drizzle(_pool);
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
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function touchUserPresence(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
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

  const matrixUpdates = await db.select({ branchId: matrixMetrics.branchId, updatedAt: matrixMetrics.updatedAt }).from(matrixMetrics);
  const matrixUpdatedAtByBranch = new Map(matrixUpdates.map(item => [item.branchId, item.updatedAt]));
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
    updatedAt: latestOverviewUpdate(metrics?.updatedAt, matrixUpdatedAtByBranch.get(branch.id), profile?.updatedAt, branch.updatedAt),
  })).sort((left, right) => {
    const rightTime = right.updatedAt?.getTime() ?? 0;
    const leftTime = left.updatedAt?.getTime() ?? 0;
    return rightTime - leftTime || left.branch.name.localeCompare(right.branch.name, "pt-BR");
  });
}

export async function listMatrixOverviews() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ branch: branches, metrics: matrixMetrics })
    .from(matrixMetrics)
    .innerJoin(branches, eq(matrixMetrics.branchId, branches.id))
    .where(eq(branches.isActive, true))
    .orderBy(branches.name);

  // A Matriz usa exclusivamente a base já importada. Filiais legadas sem
  // métricas e versões repetidas do mesmo código não entram na contagem.
  // Para um código repetido, mantém-se a métrica mais recente.
  const uniqueByCode = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = normalizeBranchCode(row.branch.code) || `id-${row.branch.id}`;
    const current = uniqueByCode.get(key);
    if (!current || (row.metrics?.updatedAt?.getTime() ?? 0) >= (current.metrics?.updatedAt?.getTime() ?? 0)) {
      uniqueByCode.set(key, row);
    }
  }

  return Array.from(uniqueByCode.values()).map(({ branch, metrics }) => ({
    branch,
    metrics: {
      ...metrics,
      // `received` foi historicamente preenchido com a coluna I (Vencido
      // Atual). Mantemos a origem bruta explícita e corrigimos a leitura para
      // que a interface sempre receba o Recebido calculado.
      currentOverdue: metrics.received,
      received: matrixReceivedAmount(metrics.received, metrics.creditGoal),
    },
    updatedAt: metrics.updatedAt,
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

export type MatrixWorkbookRows = {
  analytic: AnalyticImportRow[];
  data: DataImportRow[];
  dailyTracking: DailyTrackingImportRow[];
  challengeDaily: ChallengeDailyImportRow[];
  receiptDaily: ReceiptDailyImportRow[];
  sourceRows?: Partial<Record<"analytic" | "data" | "dailyTracking" | "challengeDaily" | "receiptDaily", { receivedRows: number; validRows: number }>>;
};

const normalizeRegional = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("pt-BR");

export async function importMatrixWorkbook(sources: MatrixWorkbookRows) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const allBranches = await db.select().from(branches);
  const existingMetrics = await db.select().from(matrixMetrics);
  const existingByBranch = new Map(existingMetrics.map(metrics => [metrics.branchId, metrics]));
  const byCode = new Map<string, typeof allBranches[number]>();
  for (const branch of allBranches) {
    const code = normalizeBranchCode(branch.code);
    if (!code) continue;
    const current = byCode.get(code);
    if (!current || (existingByBranch.has(branch.id) && !existingByBranch.has(current.id)) || branch.id > current.id) {
      byCode.set(code, branch);
    }
  }
  const byCodeFrom = <T extends { code: string }>(rows: T[]) => new Map<string, T>(rows.map(row => [row.code, row]));
  const analytics = byCodeFrom(sources.analytic);
  const dataRows = byCodeFrom(sources.data);
  const dailyTracking = byCodeFrom(sources.dailyTracking);
  const challengeDaily = byCodeFrom(sources.challengeDaily);
  const receiptDaily = byCodeFrom(sources.receiptDaily);
  // A aba Analítico é a referência de Filial e Regional. As outras abas apenas
  // complementam os indicadores da mesma filial pelo código normalizado.
  const matrixCodes = new Set<string>(Array.from(analytics.keys()));
  let imported = 0;
  const analyticCodes = new Set(Array.from(analytics.keys()));
  let unmatched = Array.from(new Set([
    ...Array.from(dataRows.keys()),
    ...Array.from(dailyTracking.keys()),
    ...Array.from(challengeDaily.keys()),
    ...Array.from(receiptDaily.keys()),
  ])).filter(code => !analyticCodes.has(code)).length;
  let regionalMismatch = 0;
  let createdBranches = 0;
  const importedAt = new Date();
  const importForBranch = async (branch: typeof allBranches[number], code: string) => {
    const analytic = analytics.get(code);
    const data = dataRows.get(code);
    const challenge = challengeDaily.get(code);
    const dailyReceipts = receiptDaily.get(code);
    const previous = existingByBranch.get(branch.id);
    const values = {
      creditGoal: analytic?.creditGoal ?? previous?.creditGoal ?? 0,
      challengeGoal: analytic?.challengeGoal ?? previous?.challengeGoal ?? 0,
      received: analytic?.received ?? previous?.received ?? 0,
      delinquencyPercent: analytic?.delinquencyPercent ?? previous?.delinquencyPercent ?? 0,
      creditEffectivenessPercent: analytic?.creditEffectivenessPercent ?? previous?.creditEffectivenessPercent ?? 0,
      challengeEffectivenessPercent: analytic?.challengeEffectivenessPercent ?? previous?.challengeEffectivenessPercent ?? 0,
      ticketGoal: analytic?.ticketGoal ?? previous?.ticketGoal ?? 0,
      ticketPercent: analytic?.ticketPercent ?? previous?.ticketPercent ?? 0,
      ticketBonus: analytic?.ticketBonus ?? previous?.ticketBonus ?? 0,
      monthlyLoss: analytic?.monthlyLoss ?? previous?.monthlyLoss ?? 0,
      lossSalesPercent: analytic?.lossSalesPercent ?? previous?.lossSalesPercent ?? 0,
      lostGoal: analytic?.lostGoal ?? previous?.lostGoal ?? 0,
      lostReceived: analytic?.lostReceived ?? previous?.lostReceived ?? 0,
      lossEffectivenessPercent: analytic?.lossEffectivenessPercent ?? previous?.lossEffectivenessPercent ?? 0,
      amountReceivable: data?.amountReceivable ?? previous?.amountReceivable ?? 0,
      overdueOpening: data?.overdueOpening ?? previous?.overdueOpening ?? 0,
      portfolioTotal: data?.portfolioTotal ?? previous?.portfolioTotal ?? 0,
      receiptForecast: data?.receiptForecast ?? previous?.receiptForecast ?? 0,
      closingForecast: data?.closingForecast ?? previous?.closingForecast ?? 0,
      closingForecastPercent: data?.closingForecastPercent ?? previous?.closingForecastPercent ?? 0,
      accumulatedLossGoal: data?.accumulatedLossGoal ?? previous?.accumulatedLossGoal ?? 0,
      accumulatedLossReceived: data?.accumulatedLossReceived ?? previous?.accumulatedLossReceived ?? 0,
      accumulatedLossBalance: data?.accumulatedLossBalance ?? previous?.accumulatedLossBalance ?? 0,
      previousDayGoal: dailyTracking.get(code)?.previousDayGoal ?? previous?.previousDayGoal ?? 0,
      dailyReceived: dailyTracking.get(code)?.received ?? previous?.dailyReceived ?? 0,
      previousDayDifference: dailyTracking.get(code)?.previousDayDifference ?? previous?.previousDayDifference ?? 0,
      accumulatedDifference: dailyTracking.get(code)?.accumulatedDifference ?? previous?.accumulatedDifference ?? 0,
      redesignedDailyGoal: dailyTracking.get(code)?.redesignedDailyGoal ?? previous?.redesignedDailyGoal ?? 0,
      challengeDailyReceivedJson: challenge?.dailyReceived ? JSON.stringify(challenge.dailyReceived) : previous?.challengeDailyReceivedJson ?? null,
      sales: dailyReceipts?.sales ?? previous?.sales ?? 0,
      receiptDailyJson: dailyReceipts?.dailyReceived ? JSON.stringify(dailyReceipts.dailyReceived) : previous?.receiptDailyJson ?? null,
      updatedAt: importedAt,
    };
    await db.insert(matrixMetrics).values({ branchId: branch.id, ...values }).onConflictDoUpdate({ target: matrixMetrics.branchId, set: values });
    const analyticRegional = analytic?.regional.trim();
    if (analyticRegional && normalizeRegional(branch.regional) !== normalizeRegional(analyticRegional)) {
      await db.update(branches).set({ regional: analyticRegional }).where(eq(branches.id, branch.id));
    }
    imported += 1;
  };
  for (const code of Array.from(matrixCodes)) {
    let branch = byCode.get(code);
    if (!branch) {
      const analyticRegional = analytics.get(code)?.regional.trim() || null;
      const [createdBranch] = await db.insert(branches).values({
        code,
        name: `Filial ${code}`,
        regional: analyticRegional,
        isActive: true,
      }).returning({ id: branches.id });
      branch = {
        id: createdBranch.id,
        code,
        name: `Filial ${code}`,
        regional: analyticRegional,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      byCode.set(code, branch);
      createdBranches += 1;
    }
    await importForBranch(branch, code);
  }
  const sourceEntries = (Object.keys(sources.sourceRows ?? {}) as Array<"analytic" | "data" | "dailyTracking" | "challengeDaily" | "receiptDaily">)
    .map(source => [source, sources.sourceRows?.[source]] as const)
    .filter((entry): entry is readonly ["analytic" | "data" | "dailyTracking" | "challengeDaily" | "receiptDaily", { receivedRows: number; validRows: number }] => Boolean(entry[1]?.receivedRows));
  for (const [source, summary] of sourceEntries) {
    await db.insert(matrixImportSources).values({ source, importedAt, receivedRows: summary.receivedRows, validRows: summary.validRows })
      .onConflictDoUpdate({ target: matrixImportSources.source, set: { importedAt, receivedRows: summary.receivedRows, validRows: summary.validRows } });
  }
  return { imported, unmatched, regionalMismatch, createdBranches };
}

export async function getAnalyticImportStatus() {
  const db = await getDb();
  if (!db) return { lastImportedAt: null, sources: [] };
  const sources = await db.select().from(matrixImportSources).orderBy(matrixImportSources.source);
  const [latest] = await db.select({ updatedAt: matrixMetrics.updatedAt }).from(matrixMetrics).orderBy(desc(matrixMetrics.updatedAt)).limit(1);
  return { lastImportedAt: latest?.updatedAt ?? null, sources };
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
  input: { colorMode?: "light" | "dark"; colorPalette?: "ocean" | "violet" | "forest" | "sunset" | "rose" | "midnight" | "citrus" | "slate"; showLostGoal?: boolean; showTicketGoal?: boolean; showPossibleRewards?: boolean; showRewardAmounts?: boolean; isOnVacation?: boolean; messageNotificationsEnabled?: boolean },
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

type MetricsInput = {
  portfolioTotal: number;
  monthOpening: number;
  dayOpening: number;
  currentOverdue: number;
  creditGoal: number;
  challengeGoal: number;
  lostGoal: number;
  lostReceived: number;
  workingDaysMode: WorkingDaysMode;
  countToday: boolean;
  includeSaturday: boolean;
  includeSunday: boolean;
  workingDaysTotal: number;
  workingDaysElapsed: number;
  ticketWorkingDaysRemaining: number;
  manualHolidayDates: string[];
  fiadoAtDay15: boolean;
  fiadoAtDay15Month?: string | null;
};

const emptyMetrics: MetricsInput = {
  portfolioTotal: 0,
  monthOpening: 0,
  dayOpening: 0,
  currentOverdue: 0,
  creditGoal: 0,
  challengeGoal: 0,
  lostGoal: 0,
  lostReceived: 0,
  workingDaysMode: "automatic" as WorkingDaysMode,
  countToday: true,
  includeSaturday: true,
  includeSunday: false,
  workingDaysTotal: 0,
  workingDaysElapsed: 0,
  ticketWorkingDaysRemaining: 0,
  manualHolidayDates: [] as string[],
  fiadoAtDay15: false,
  fiadoAtDay15Month: null,
};

type PersistedMetrics = Omit<MetricsInput, "manualHolidayDates" | "workingDaysMode"> & {
  workingDaysMode: string;
  manualHolidayDatesJson?: unknown;
};

function manualHolidayDatesFromStoredValue(value: unknown) {
  if (typeof value !== "string") return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [] as string[];
    return Array.from(new Set(parsed.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)))).slice(0, 31);
  } catch {
    return [] as string[];
  }
}

function currentBrazilMonth() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find(part => part.type === "year")?.value ?? ""}-${parts.find(part => part.type === "month")?.value ?? ""}`;
}

function metricsForClient(values: PersistedMetrics): MetricsInput {
  return applyWorkingDaysMode({
    portfolioTotal: values.portfolioTotal,
    monthOpening: values.monthOpening,
    dayOpening: values.dayOpening,
    currentOverdue: values.currentOverdue,
    creditGoal: values.creditGoal,
    challengeGoal: values.challengeGoal,
    lostGoal: values.lostGoal,
    lostReceived: values.lostReceived,
    workingDaysMode: values.workingDaysMode === "manual" ? "manual" : "automatic",
    countToday: values.countToday ?? true,
    includeSaturday: values.includeSaturday ?? true,
    includeSunday: values.includeSunday ?? false,
    workingDaysTotal: values.workingDaysTotal,
    workingDaysElapsed: values.workingDaysElapsed,
    ticketWorkingDaysRemaining: values.ticketWorkingDaysRemaining,
    manualHolidayDates: manualHolidayDatesFromStoredValue(values.manualHolidayDatesJson),
    fiadoAtDay15: Boolean(values.fiadoAtDay15 && values.fiadoAtDay15Month === currentBrazilMonth()),
    fiadoAtDay15Month: values.fiadoAtDay15Month ?? null,
  });
}

export async function getMyMetrics(userId: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return emptyMetrics;
  const profile = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const storageScope = resolveMetricStorageScope(userId, profile[0]?.branchId);
  if (storageScope.type === "branch") {
    const sharedMetrics = await db.select().from(branchMetrics).where(eq(branchMetrics.branchId, storageScope.branchId)).limit(1);
    return metricsForClient(sharedMetrics[0] ?? emptyMetrics);
  }
  const legacyMetrics = await db.select().from(metricSettings).where(eq(metricSettings.userId, userId)).limit(1);
  return metricsForClient(legacyMetrics[0] ?? emptyMetrics);
}

export async function getMatrixAutofillForUser(userId: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const profile = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const branchId = profile[0]?.branchId;
  if (!branchId) throw new Error("Seu perfil não possui uma filial vinculada para carregar dados da Matriz.");

  const matrix = await db.select().from(matrixMetrics).where(eq(matrixMetrics.branchId, branchId)).limit(1);
  const metrics = matrix[0];
  if (!metrics) throw new Error("Não há dados da Matriz importados para a sua filial.");

  // Campos sem uma origem confiável na Matriz (abertura do dia e calendário)
  // não são retornados, preservando a edição local do operador.
  return {
    portfolioTotal: metrics.portfolioTotal,
    monthOpening: metrics.overdueOpening,
    currentOverdue: metrics.received,
    creditGoal: metrics.creditGoal,
    challengeGoal: metrics.challengeGoal,
    lostGoal: metrics.lostGoal,
    lostReceived: metrics.lostReceived,
  };
}

export async function saveMyMetrics(userId: number, input: MetricsInput, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const normalizedInput = applyWorkingDaysMode({ ...input, manualHolidayDates: Array.from(new Set(input.manualHolidayDates ?? [])).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(0, 31) });
  const { manualHolidayDates, ...metricValues } = normalizedInput;
  const persistenceValues = { ...metricValues, manualHolidayDatesJson: JSON.stringify(manualHolidayDates) };
  const profile = await db.select({ branchId: userProfiles.branchId }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const now = new Date();
  const brazilParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "numeric" }).formatToParts(now);
  const brazilYear = brazilParts.find(part => part.type === "year")?.value ?? "";
  const brazilMonth = brazilParts.find(part => part.type === "month")?.value ?? "";
  const brazilDay = brazilParts.find(part => part.type === "day")?.value ?? "";
  const currentMonth = `${brazilYear}-${brazilMonth}`;
  const dayInBrazil = Number(brazilDay);
  const received = receiptAmounts(normalizedInput.monthOpening, normalizedInput.dayOpening, normalizedInput.currentOverdue).accumulated;
  const reachedBeforeDeadline = dayInBrazil <= 15 && received >= ticketGoalAmount(amountReceivable(normalizedInput.monthOpening, normalizedInput.creditGoal));
  const storageScope = resolveMetricStorageScope(userId, profile[0]?.branchId);
  if (storageScope.type === "branch") {
    const existing = await db.select({ fiadoAtDay15: branchMetrics.fiadoAtDay15, fiadoAtDay15Month: branchMetrics.fiadoAtDay15Month }).from(branchMetrics).where(eq(branchMetrics.branchId, storageScope.branchId)).limit(1);
    const preserved = Boolean(existing[0]?.fiadoAtDay15 && existing[0]?.fiadoAtDay15Month === currentMonth);
    const values = { ...persistenceValues, fiadoAtDay15: Boolean(preserved || reachedBeforeDeadline), fiadoAtDay15Month: (preserved || reachedBeforeDeadline) ? currentMonth : null };
    await db.insert(branchMetrics).values({ branchId: storageScope.branchId, ...values }).onConflictDoUpdate({ target: branchMetrics.branchId, set: values });
    return;
  }
  const existing = await db.select({ fiadoAtDay15: metricSettings.fiadoAtDay15 }).from(metricSettings).where(eq(metricSettings.userId, userId)).limit(1);
  const values = { ...persistenceValues, fiadoAtDay15: Boolean(existing[0]?.fiadoAtDay15 || reachedBeforeDeadline) };
  await db.insert(metricSettings).values({ userId, ...values }).onConflictDoUpdate({ target: metricSettings.userId, set: values });
}

export type ReceiptHistoryInput = {
  entryDate: string;
  receivedAmount: number;
  monthOpening?: number;
  creditGoal?: number;
  challengeGoal?: number;
  currentOverdue?: number;
  delinquencyPercent?: number;
  previousMonthDifference?: number;
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
  if (!db) return { month, entries: [], totalReceived: 0, daysRecorded: 0, averagePerDay: 0, indicators: null };
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
  const latest = entries[0];
  return {
    month,
    entries,
    totalReceived,
    daysRecorded: entries.length,
    averagePerDay: entries.length ? totalReceived / entries.length : 0,
    indicators: latest ? { monthOpening: latest.monthOpening, creditGoal: latest.creditGoal, challengeGoal: latest.challengeGoal, currentOverdue: latest.currentOverdue, delinquencyPercent: latest.delinquencyPercent, previousMonthDifference: latest.previousMonthDifference } : null,
  };
}

export async function getReceiptDailyStatus(userId: number, entryDate: string, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) return { hasBranch: false, hasEntry: false, entryDate };
  const branchId = await getHistoryBranchId(db, userId).catch(() => null);
  if (!branchId) return { hasBranch: false, hasEntry: false, entryDate };
  const [entry] = await db
    .select({ id: receiptHistoryEntries.id })
    .from(receiptHistoryEntries)
    .where(and(eq(receiptHistoryEntries.branchId, branchId), eq(receiptHistoryEntries.entryDate, assertCalendarDate(entryDate))))
    .limit(1);
  return { hasBranch: true, hasEntry: Boolean(entry), entryDate };
}

async function getReceiptHistorySnapshot(db: ApplicationDatabase, branchId: number, entryDate: string) {
  const [metrics] = await db.select({ monthOpening: branchMetrics.monthOpening, creditGoal: branchMetrics.creditGoal, challengeGoal: branchMetrics.challengeGoal, currentOverdue: branchMetrics.currentOverdue, portfolioTotal: branchMetrics.portfolioTotal }).from(branchMetrics).where(eq(branchMetrics.branchId, branchId)).limit(1);
  const [year, month] = entryDate.slice(0, 7).split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousMonth = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  const previousEnd = `${entryDate.slice(0, 7)}-01`;
  const [previousEntry] = await db.select({ currentOverdue: receiptHistoryEntries.currentOverdue }).from(receiptHistoryEntries).where(and(eq(receiptHistoryEntries.branchId, branchId), gte(receiptHistoryEntries.entryDate, `${previousMonth}-01`), lt(receiptHistoryEntries.entryDate, previousEnd))).orderBy(desc(receiptHistoryEntries.entryDate)).limit(1);
  const currentOverdue = metrics?.currentOverdue ?? 0;
  return { monthOpening: metrics?.monthOpening ?? 0, creditGoal: metrics?.creditGoal ?? 0, challengeGoal: metrics?.challengeGoal ?? 0, currentOverdue, delinquencyPercent: metrics?.portfolioTotal ? (currentOverdue / metrics.portfolioTotal) * 100 : 0, previousMonthDifference: currentOverdue - (previousEntry?.currentOverdue ?? currentOverdue) };
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
  const snapshot = await getReceiptHistorySnapshot(db, branchId, entryDate);
  await db.insert(receiptHistoryEntries).values({ branchId, entryDate, receivedAmount: input.receivedAmount, createdByUserId: userId, ...snapshot, ...Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== "entryDate" && key !== "receivedAmount" && value !== undefined)) });
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
  const current = await getHistoryEntryForBranch(db, id, branchId);
  const snapshot = { monthOpening: current.monthOpening, creditGoal: current.creditGoal, challengeGoal: current.challengeGoal, currentOverdue: current.currentOverdue, delinquencyPercent: current.delinquencyPercent, previousMonthDifference: current.previousMonthDifference };
  await db.update(receiptHistoryEntries).set({ entryDate, receivedAmount: input.receivedAmount, ...snapshot, ...Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== "entryDate" && key !== "receivedAmount" && value !== undefined)) }).where(eq(receiptHistoryEntries.id, id));
}

export async function deleteReceiptHistoryEntry(userId: number, id: number, database?: ApplicationDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const branchId = await getHistoryBranchId(db, userId);
  await getHistoryEntryForBranch(db, id, branchId);
  await db.delete(receiptHistoryEntries).where(eq(receiptHistoryEntries.id, id));
}

export const subscriptionFeatureKeys = ["overview", "matrix", "branches", "history", "utilities", "chat", "metrics", "appearance", "help", "updates"] as const;
export type SubscriptionFeatureKey = typeof subscriptionFeatureKeys[number];
export type SubscriptionPlan = "free" | "pro";
export type SubscriptionPlanInfoBackground = "sky" | "emerald" | "violet" | "amber" | "rose" | "slate";
export type SubscriptionSettingsInput = {
  monthlyPrice: number;
  promotionOriginalPrice: number;
  promotionPrice: number;
  promotionBadge: string;
  promotionTitle: string;
  promotionDescription: string;
  promotionBackground: SubscriptionPlanInfoBackground;
  promotionCtaLabel: string;
  planInfoTitle: string;
  planInfoDescription: string;
  planInfoBackground: SubscriptionPlanInfoBackground;
  planInfoCtaEnabled: boolean;
  planInfoCtaLabel: string;
  planInfoCtaUrl: string;
  pixKey: string;
  pixCopyPaste: string;
  pixReceiverName: string;
  pixReceiverBank: string;
  subscriberGoalMinimum: number;
  subscriberGoalCurrent: number;
  subscriberGoalContext: string;
  customPlansJson: string;
  overviewPlan: SubscriptionPlan;
  matrixPlan: SubscriptionPlan;
  branchesPlan: SubscriptionPlan;
  historyPlan: SubscriptionPlan;
  utilitiesPlan: SubscriptionPlan;
  chatPlan: SubscriptionPlan;
  metricsPlan: SubscriptionPlan;
  appearancePlan: SubscriptionPlan;
  helpPlan: SubscriptionPlan;
  updatesPlan: SubscriptionPlan;
};

const defaultSubscriptionSettings: SubscriptionSettingsInput & { pixQrCodeUrl: string } = {
  monthlyPrice: 0,
  promotionOriginalPrice: 0,
  promotionPrice: 0,
  promotionBadge: "Oferta especial",
  promotionTitle: "Plano PRO em oferta",
  promotionDescription: "Aproveite o valor promocional para liberar todos os recursos PRO.",
  promotionBackground: "emerald",
  promotionCtaLabel: "Enviar comprovante para assinar PRO",
  planInfoTitle: "Plano PRO do Meu Fiado",
  planInfoDescription: "Tenha acesso aos recursos avançados e acompanhe sua assinatura por aqui.",
  planInfoBackground: "sky",
  planInfoCtaEnabled: false,
  planInfoCtaLabel: "",
  planInfoCtaUrl: "",
  pixKey: "",
  pixCopyPaste: "",
  pixQrCodeUrl: "",
  pixReceiverName: "MEU FIADO",
  pixReceiverBank: "",
  subscriberGoalMinimum: 0,
  subscriberGoalCurrent: 0,
  subscriberGoalContext: "",
  customPlansJson: "[]",
  overviewPlan: "free",
  matrixPlan: "pro",
  branchesPlan: "pro",
  historyPlan: "pro",
  utilitiesPlan: "pro",
  chatPlan: "pro",
  metricsPlan: "free",
  appearancePlan: "free",
  helpPlan: "free",
  updatesPlan: "free",
};

export function hasActiveSubscriptionPromotion(settings: Pick<SubscriptionSettingsInput, "promotionOriginalPrice" | "promotionPrice">) {
  return settings.promotionOriginalPrice > settings.promotionPrice && settings.promotionPrice > 0;
}

export function getSubscriptionChargeAmount(settings: Pick<SubscriptionSettingsInput, "monthlyPrice" | "promotionOriginalPrice" | "promotionPrice">) {
  return hasActiveSubscriptionPromotion(settings) ? settings.promotionPrice : settings.monthlyPrice;
}
type SubscriptionPlanOption = { id: string; monthlyPrice: number; promotionPrice: number; isVisible?: boolean };
function readSubscriptionPlanOptions(value: string | null | undefined): SubscriptionPlanOption[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && String(item.id || "").trim()).map(item => ({
      id: String(item.id),
      monthlyPrice: Number(item.monthlyPrice) || 0,
      promotionPrice: Number(item.promotionPrice) || 0,
      isVisible: item.isVisible !== false,
    })) : [];
  } catch {
    return [];
  }
}
export function getSubscriptionPlanChargeAmount(settings: Pick<SubscriptionSettingsInput, "monthlyPrice" | "promotionOriginalPrice" | "promotionPrice" | "customPlansJson">, planId: string) {
  if (planId !== "default") {
    const plan = readSubscriptionPlanOptions(settings.customPlansJson).find(item => item.id === planId && item.isVisible);
    if (!plan) return 0;
    return plan.promotionPrice > 0 && plan.promotionPrice < plan.monthlyPrice ? plan.promotionPrice : plan.monthlyPrice;
  }
  return getSubscriptionChargeAmount(settings);
}
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
  const values = { ...input, pixCopyPaste: "", pixQrCodeUrl: "", updatedByUserId: actorUserId };
  if (current.id) await db.update(subscriptionSettings).set(values).where(eq(subscriptionSettings.id, current.id));
  else await db.insert(subscriptionSettings).values(values);
  return getSubscriptionSettings(db);
}

export async function uploadSubscriptionPixQrCode(actorUserId: number, dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Envie o QR Code em JPG, PNG ou WEBP.");
  const contentType = match[1];
  const binary = Buffer.from(match[2], "base64");
  if (binary.length === 0 || binary.length > 2 * 1024 * 1024) throw new Error("A imagem do QR Code deve ter no máximo 2 MB.");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const uploaded = await storagePut(`subscription-payment-qr/${actorUserId}/${randomUUID()}.${extension}`, binary, contentType);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const settings = await getSubscriptionSettings(db);
  if (settings.id) await db.update(subscriptionSettings).set({ pixQrCodeUrl: uploaded.url, updatedByUserId: actorUserId }).where(eq(subscriptionSettings.id, settings.id));
  else await db.insert(subscriptionSettings).values({ ...defaultSubscriptionSettings, pixQrCodeUrl: uploaded.url, updatedByUserId: actorUserId });
  return getSubscriptionSettings(db);
}

export async function expireSubscriptionsPastGracePeriod(now = new Date()) {
  const db = await getDb();
  if (!db) return { expiredAt: now, affected: 0 };
  const graceCutoff = new Date(now.getTime() - SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const result = await db.update(users)
    .set({ plan: "free", proExpiresAt: null })
    .where(and(eq(users.plan, "pro"), lte(users.proExpiresAt, graceCutoff)));
  return { expiredAt: now, affected: Number((result as { affectedRows?: number }).affectedRows ?? 0) };
}

export async function getMySubscription(userId: number) {
  const db = await getDb();
  const settings = await getSubscriptionSettings(db ?? undefined);
  if (!db) return { plan: "free" as const, isPro: false, status: "free" as const, proExpiresAt: null, graceEndsAt: null, settings, latestProof: null, latestPixPayment: null };
  const [account] = await db.select({ plan: users.plan, proExpiresAt: users.proExpiresAt }).from(users).where(eq(users.id, userId)).limit(1);
  const [latestProof] = await db.select().from(subscriptionProofs).where(eq(subscriptionProofs.userId, userId)).orderBy(desc(subscriptionProofs.createdAt)).limit(1);
  const [latestPixPayment] = await db.select().from(mercadoPagoPixPayments).where(eq(mercadoPagoPixPayments.userId, userId)).orderBy(desc(mercadoPagoPixPayments.createdAt)).limit(1);
  const access = resolveSubscriptionAccess({ plan: (account?.plan ?? "free") as SubscriptionPlan, proExpiresAt: account?.proExpiresAt ?? null });
  if (account && access.status === "expired") {
    await db.update(users).set({ plan: "free", proExpiresAt: null }).where(eq(users.id, userId));
  }
  return { plan: access.plan, isPro: access.isPro, status: access.status, proExpiresAt: account?.proExpiresAt ?? null, graceEndsAt: access.graceEndsAt, settings, latestProof: latestProof ?? null, latestPixPayment: latestPixPayment ?? null };
}

export async function canAccessSubscriptionFeature(userId: number, role: "admin" | "user", feature: SubscriptionFeatureKey) {
  if (role === "admin") return true;
  const subscription = await getMySubscription(userId);
  const settingKey = `${feature}Plan` as const;
  return subscription.isPro || subscription.settings[settingKey] === "free";
}

export async function setManagedUserPlan(userId: number, plan: SubscriptionPlan, proExpiresAt?: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const expiresAt = plan === "pro" ? (proExpiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null;
  await db.update(users).set({ plan, proExpiresAt: expiresAt }).where(eq(users.id, userId));
}

function parseProviderDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createMercadoPagoPixPaymentRecord(input: {
  userId: number;
  planId: string;
  amount: number;
  payerEmail: string;
  notificationUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const externalReference = `mf-pix-${input.userId}-${randomUUID()}`;
  const providerPayment = await createMercadoPagoPixPayment({
    amount: input.amount,
    description: `Assinatura PRO Meu Fiado - ${input.planId}`,
    externalReference,
    payerEmail: input.payerEmail,
    notificationUrl: input.notificationUrl,
    idempotencyKey: randomUUID(),
  });
  const transactionData = providerPayment.point_of_interaction?.transaction_data;
  if (!providerPayment.id || !transactionData?.qr_code) throw new Error("O Mercado Pago não retornou os dados do PIX.");
  const [created] = await db.insert(mercadoPagoPixPayments).values({
    userId: input.userId,
    planId: input.planId,
    externalReference,
    providerPaymentId: String(providerPayment.id),
    status: providerPayment.status === "approved" ? "pending" : (providerPayment.status ?? "pending"),
    statusDetail: providerPayment.status_detail ?? null,
    amount: input.amount,
    currencyId: providerPayment.currency_id ?? "BRL",
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64 ?? null,
    ticketUrl: transactionData.ticket_url ?? null,
    dateOfExpiration: parseProviderDate(providerPayment.date_of_expiration),
    // A data só é gravada pelo processador idempotente após renovar o usuário.
    dateApproved: null,
  }).returning();
  if (providerPayment.status === "approved") await processMercadoPagoPixWebhook(String(providerPayment.id));
  return created;
}

export async function processMercadoPagoPixWebhook(paymentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const providerPayment = await getMercadoPagoPayment(paymentId);
  const externalReference = providerPayment.external_reference;
  if (!externalReference) return { handled: false, renewed: false, reason: "missing-reference" as const };
  const [storedPayment] = await db.select().from(mercadoPagoPixPayments).where(eq(mercadoPagoPixPayments.externalReference, externalReference)).limit(1);
  if (!storedPayment) return { handled: false, renewed: false, reason: "payment-not-found" as const };
  const amountMatches = providerPayment.currency_id === "BRL" && Math.round((providerPayment.transaction_amount ?? 0) * 100) === Math.round(storedPayment.amount * 100);
  const status = amountMatches ? (providerPayment.status ?? "unknown") : "amount_mismatch";
  const statusDetail = amountMatches ? (providerPayment.status_detail ?? null) : "Valor diferente do pedido original.";
  const paymentData = {
    providerPaymentId: String(providerPayment.id ?? paymentId),
    status,
    statusDetail,
    dateApproved: parseProviderDate(providerPayment.date_approved),
    updatedAt: new Date(),
  };
  if (status !== "approved") {
    await db.update(mercadoPagoPixPayments).set(paymentData).where(eq(mercadoPagoPixPayments.id, storedPayment.id));
    return { handled: true, renewed: false, reason: status as "pending" | "rejected" | "cancelled" | "amount_mismatch" | "unknown" };
  }
  return db.transaction(async tx => {
    const [marked] = await tx.update(mercadoPagoPixPayments)
      .set(paymentData)
      .where(and(eq(mercadoPagoPixPayments.id, storedPayment.id), ne(mercadoPagoPixPayments.status, "approved")))
      .returning({ id: mercadoPagoPixPayments.id });
    if (!marked) return { handled: true, renewed: false, reason: "already-processed" as const };
    const [account] = await tx.select({ plan: users.plan, proExpiresAt: users.proExpiresAt }).from(users).where(eq(users.id, storedPayment.userId)).limit(1);
    const now = new Date();
    const activeExpiry = account?.plan === "pro" && account.proExpiresAt && account.proExpiresAt > now ? account.proExpiresAt : now;
    const renewedUntil = new Date(activeExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    await tx.update(users).set({ plan: "pro", proExpiresAt: renewedUntil }).where(eq(users.id, storedPayment.userId));
    return { handled: true, renewed: true, renewedUntil, reason: "approved" as const };
  });
}

export async function getMercadoPagoSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [subscription] = await db.select().from(mercadoPagoSubscriptions).where(eq(mercadoPagoSubscriptions.userId, userId)).limit(1);
  return subscription ?? null;
}

export async function saveMercadoPagoSubscription(input: {
  userId: number;
  externalReference: string;
  preapprovalId: string;
  checkoutUrl: string | null;
  providerStatus: string;
  amount: number;
  nextPaymentDate: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(mercadoPagoSubscriptions).values(input).onConflictDoUpdate({ target: mercadoPagoSubscriptions.userId,
    set: {
      externalReference: input.externalReference,
      preapprovalId: input.preapprovalId,
      checkoutUrl: input.checkoutUrl,
      providerStatus: input.providerStatus,
      amount: input.amount,
      nextPaymentDate: input.nextPaymentDate,
    },
  });
  return getMercadoPagoSubscription(input.userId);
}

export async function updateMercadoPagoSubscriptionStatus(preapprovalId: string, providerStatus: string, nextPaymentDate: Date | null) {
  const db = await getDb();
  if (!db) return null;
  await db.update(mercadoPagoSubscriptions)
    .set({ providerStatus, nextPaymentDate })
    .where(eq(mercadoPagoSubscriptions.preapprovalId, preapprovalId));
  const [subscription] = await db.select().from(mercadoPagoSubscriptions).where(eq(mercadoPagoSubscriptions.preapprovalId, preapprovalId)).limit(1);
  return subscription ?? null;
}

export async function applyMercadoPagoApprovedPayment(input: {
  authorizedPaymentId: string;
  paymentId: string | null;
  preapprovalId: string;
  paymentStatus: string;
  amount: number;
  paidAt: Date | null;
  nextPaymentDate: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.transaction(async tx => {
    const [subscription] = await tx.select().from(mercadoPagoSubscriptions)
      .where(eq(mercadoPagoSubscriptions.preapprovalId, input.preapprovalId)).limit(1);
    if (!subscription) return { applied: false, renewed: false, reason: "subscription-not-found" as const };

    await tx.update(mercadoPagoSubscriptions)
      .set({ providerStatus: input.paymentStatus, nextPaymentDate: input.nextPaymentDate })
      .where(eq(mercadoPagoSubscriptions.id, subscription.id));

    const [existingPayment] = await tx.select().from(mercadoPagoSubscriptionPayments)
      .where(eq(mercadoPagoSubscriptionPayments.authorizedPaymentId, input.authorizedPaymentId)).limit(1);
    if (existingPayment) return { applied: false, renewed: false, reason: "already-processed" as const };

    await tx.insert(mercadoPagoSubscriptionPayments).values({
      mercadoPagoSubscriptionId: subscription.id,
      userId: subscription.userId,
      authorizedPaymentId: input.authorizedPaymentId,
      paymentId: input.paymentId,
      paymentStatus: input.paymentStatus,
      amount: input.amount,
      paidAt: input.paidAt,
    });
    if (input.paymentStatus !== "approved") return { applied: true, renewed: false, reason: "not-approved" as const };

    const [account] = await tx.select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
      .from(users).where(eq(users.id, subscription.userId)).limit(1);
    const now = new Date();
    const activeExpiry = account?.plan === "pro" && account.proExpiresAt && account.proExpiresAt > now
      ? account.proExpiresAt
      : now;
    const renewedUntil = new Date(activeExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    await tx.update(users).set({ plan: "pro", proExpiresAt: renewedUntil }).where(eq(users.id, subscription.userId));
    return { applied: true, renewed: true, renewedUntil, reason: "approved" as const };
  });
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
    await db.delete(supportConversations).where(or(eq(supportConversations.requesterUserId, profile.userId), eq(supportConversations.adminUserId, profile.userId)));
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
  const supportThreads = await db
    .select({ requesterUserId: supportConversations.requesterUserId, adminUserId: supportConversations.adminUserId, topic: supportConversations.topic, updatedAt: supportConversations.updatedAt })
    .from(supportConversations)
    .where(or(eq(supportConversations.requesterUserId, userId), eq(supportConversations.adminUserId, userId)))
    .orderBy(desc(supportConversations.updatedAt));
  const supportByPartner = new Map<number, typeof supportThreads[number]>();
  for (const thread of supportThreads) {
    const partnerId = thread.requesterUserId === userId ? thread.adminUserId : thread.requesterUserId;
    if (!supportByPartner.has(partnerId)) supportByPartner.set(partnerId, thread);
  }
  const partnerIds = Array.from(new Set([...Array.from(latestByPartner.keys()), ...Array.from(supportByPartner.keys())]));
  if (!partnerIds.length) return [];
  const partners = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, partnerIds));
  const partnersById = new Map(partners.map(partner => [partner.id, partner]));
  return partnerIds
    .map(partnerId => {
      const partner = partnersById.get(partnerId);
      const latestMessage = latestByPartner.get(partnerId);
      const supportThread = supportByPartner.get(partnerId);
      if (!partner || (!latestMessage && !supportThread)) return null;
      return {
        recipientUserId: partner.id,
        recipientName: partner.name ?? "Usuário",
        recipientRole: partner.role,
        lastMessageBody: latestMessage?.body ?? `Assunto: ${supportThread?.topic ?? "Atendimento"}`,
        lastMessageAt: latestMessage?.createdAt ?? supportThread!.updatedAt,
        supportTopic: supportThread?.topic ?? null,
      };
    })
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread))
    .sort((left, right) => right.lastMessageAt.getTime() - left.lastMessageAt.getTime());
}

export type SupportAdminCandidate = {
  id: number;
  name: string | null;
  lastSignedIn: Date | null;
  supportAvailability: "available" | "away" | "busy";
};

export function selectChatSupportAdmin(administrators: SupportAdminCandidate[], currentUserId: number, now = Date.now()) {
  const byMostRecentPresence = [...administrators].sort((left, right) => {
    const rightPresence = right.lastSignedIn?.getTime() ?? 0;
    const leftPresence = left.lastSignedIn?.getTime() ?? 0;
    return rightPresence - leftPresence;
  });
  const currentAdministrator = byMostRecentPresence.find(candidate => candidate.id === currentUserId);
  const administrator = currentAdministrator ?? byMostRecentPresence[0] ?? null;
  if (!administrator) return null;
  const isOnline = Boolean(administrator.lastSignedIn && now - administrator.lastSignedIn.getTime() <= 3 * 60 * 1000);
  const availabilityLabel = administrator.supportAvailability === "away"
    ? "Ausente"
    : administrator.supportAvailability === "busy"
      ? "Em atendimento"
      : isOnline
        ? "Disponível agora"
        : "Indisponível no momento";
  return {
    ...administrator,
    isOnline,
    availabilityLabel,
  };
}

export async function getChatSupportAdmin(currentUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const administrators = await db
    .select({ id: users.id, name: users.name, lastSignedIn: users.lastSignedIn, supportAvailability: users.supportAvailability })
    .from(users)
    .where(eq(users.role, "admin"));
  const administrator = selectChatSupportAdmin(administrators, currentUserId);
  if (!administrator) return null;
  return {
    id: administrator.id,
    name: administrator.name ?? "Administrador",
    isOnline: administrator.isOnline,
    availabilityLabel: administrator.availabilityLabel,
    supportAvailability: administrator.supportAvailability,
  };
}

export async function getMySupportAvailability(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [user] = await db.select({ supportAvailability: users.supportAvailability }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Administrador não encontrado.");
  return user;
}

export async function setMySupportAvailability(userId: number, supportAvailability: "available" | "away" | "busy") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ supportAvailability }).where(eq(users.id, userId));
  return { supportAvailability };
}

export async function recordSupportConversationTopic(input: { requesterUserId: number; adminUserId: number; topic: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const topic = input.topic.trim();
  if (!topic) throw new Error("Informe o assunto do atendimento.");
  const [administrator] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.adminUserId)).limit(1);
  if (administrator?.role !== "admin") throw new Error("O atendimento deve ser direcionado a um administrador.");
  await db
    .insert(supportConversations)
    .values({ requesterUserId: input.requesterUserId, adminUserId: input.adminUserId, topic })
    .onConflictDoUpdate({ target: [supportConversations.requesterUserId, supportConversations.adminUserId], set: { topic, updatedAt: new Date() } });
  return { topic };
}

export async function sendChatMessage(input: { senderUserId: number; recipientUserId?: number | null; body: string; supportTopic?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const body = input.body.trim();
  if (!body) throw new Error("A mensagem não pode estar vazia.");
  const supportTopic = input.supportTopic?.trim() || null;
  if (supportTopic && input.recipientUserId) {
    await recordSupportConversationTopic({ requesterUserId: input.senderUserId, adminUserId: input.recipientUserId, topic: supportTopic });
  }
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(chatMessages).values({ senderUserId: input.senderUserId, recipientUserId: input.recipientUserId ?? null, supportTopic, body, expiresAt });
}

export async function deleteExpiredChatMessages() {
  const db = await getDb();
  if (!db) return { deleted: 0 };
  const result = await db.delete(chatMessages).where(lt(chatMessages.expiresAt, new Date()));
  return { deleted: result.rowCount ?? 0 };
}

export async function markChatMessagesRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  const [latestMessage] = await db.select({ id: chatMessages.id }).from(chatMessages).orderBy(desc(chatMessages.id)).limit(1);
  const lastReadMessageId = latestMessage?.id ?? 0;
  await db.insert(chatReadStates).values({ userId, lastReadMessageId }).onConflictDoUpdate({ target: chatReadStates.userId, set: { lastReadMessageId } });
}

export async function isAdministratorUser(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.role === "admin";
}

export async function countUnreadChatMessages(userId: number, options?: { adminOnly?: boolean }) {
  const db = await getDb();
  if (!db) return 0;
  const [readState] = await db.select({ lastReadMessageId: chatReadStates.lastReadMessageId }).from(chatReadStates).where(eq(chatReadStates.userId, userId)).limit(1);
  const lastReadMessageId = readState?.lastReadMessageId ?? 0;
  const [result] = await db
    .select({ total: count() })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderUserId, users.id))
    .where(and(
      gt(chatMessages.id, lastReadMessageId),
      gt(chatMessages.expiresAt, new Date()),
      ne(chatMessages.senderUserId, userId),
      or(isNull(chatMessages.recipientUserId), eq(chatMessages.recipientUserId, userId)),
      ...(options?.adminOnly ? [eq(users.role, "admin"), isNotNull(chatMessages.recipientUserId)] : []),
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

export type UpdateNoteInput = {
  title: string;
  description: string;
  category: string;
  isVisible: boolean;
};

export async function listUpdateNotes(includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  const ordering = [desc(updateNotes.createdAt), desc(updateNotes.id)];
  if (includeHidden) return db.select().from(updateNotes).orderBy(...ordering);
  return db.select().from(updateNotes).where(eq(updateNotes.isVisible, true)).orderBy(...ordering);
}

export async function createUpdateNote(input: UpdateNoteInput, createdByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(updateNotes).values({ ...input, createdByUserId });
}

export async function updateUpdateNote(id: number, input: UpdateNoteInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(updateNotes).set(input).where(eq(updateNotes.id, id));
}

export async function deleteUpdateNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(updateNotes).where(eq(updateNotes.id, id));
}

export async function countUnreadUpdateNotes(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [state] = await db.select().from(updateReadStates).where(eq(updateReadStates.userId, userId)).limit(1);
  const [result] = await db
    .select({ total: count() })
    .from(updateNotes)
    .where(and(eq(updateNotes.isVisible, true), gt(updateNotes.id, state?.lastReadUpdateId ?? 0)));
  return Number(result?.total ?? 0);
}

export async function markUpdateNotesRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [latest] = await db
    .select({ id: updateNotes.id })
    .from(updateNotes)
    .where(eq(updateNotes.isVisible, true))
    .orderBy(desc(updateNotes.id))
    .limit(1);
  if (!latest) return;
  await db
    .insert(updateReadStates)
    .values({ userId, lastReadUpdateId: latest.id })
    .onConflictDoUpdate({ target: updateReadStates.userId, set: { lastReadUpdateId: latest.id, updatedAt: new Date() } });
}

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

export type RomaneioPartyInput = {
  name: string;
  branch?: string | null;
  address?: string | null;
  neighborhood?: string | null;
};

export type RomaneioDocumentInput = {
  invoiceNumber: string;
  transferDate: string;
  requesting: RomaneioPartyInput;
  providing: RomaneioPartyInput;
  items: Array<{
    productCode?: string | null;
    productName: string;
    unit?: string | null;
  }>;
};

function compactRomaneioText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeRomaneioCatalogValue(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

function getRomaneioStatus(originSignedAt: Date | null, destinationSignedAt: Date | null) {
  if (originSignedAt && destinationSignedAt) return "signed" as const;
  if (originSignedAt || destinationSignedAt) return "partially_signed" as const;
  return "shared" as const;
}

export const romaneioSignatureStyles = ["classica", "manuscrita", "elegante", "simples", "manual"] as const;
export type RomaneioSignatureStyle = (typeof romaneioSignatureStyles)[number];

function partyForRomaneioSigner(document: typeof romaneios.$inferSelect, signer: "origin" | "destination") {
  return signer === "origin"
    ? { name: document.originName, branch: document.originBranch, address: document.originAddress, neighborhood: document.originNeighborhood }
    : { name: document.destinationName, branch: document.destinationBranch, address: document.destinationAddress, neighborhood: document.destinationNeighborhood };
}

async function preferredSignatureStyleForParty(db: ApplicationDatabase, party: ReturnType<typeof partyForRomaneioSigner>) {
  const [catalogParty] = await db.select({ preferredSignatureStyle: romaneioParties.preferredSignatureStyle })
    .from(romaneioParties)
    .where(and(
      eq(romaneioParties.normalizedName, normalizeRomaneioCatalogValue(party.name)),
      eq(romaneioParties.normalizedBranch, normalizeRomaneioCatalogValue(party.branch)),
    ))
    .limit(1);
  return catalogParty?.preferredSignatureStyle ?? null;
}

async function romaneioDetail(db: ApplicationDatabase, document: typeof romaneios.$inferSelect, items: Array<typeof romaneioItems.$inferSelect>) {
  const [activities, originPreferredSignatureStyle, destinationPreferredSignatureStyle] = await Promise.all([
    db.select().from(romaneioActivities).where(eq(romaneioActivities.romaneioId, document.id)).orderBy(desc(romaneioActivities.occurredAt)),
    preferredSignatureStyleForParty(db, partyForRomaneioSigner(document, "origin")),
    preferredSignatureStyleForParty(db, partyForRomaneioSigner(document, "destination")),
  ]);
  return { ...document, items, activities, originPreferredSignatureStyle, destinationPreferredSignatureStyle };
}

async function persistRomaneioCatalogs(db: ApplicationDatabase, input: RomaneioDocumentInput) {
  const parties = [input.requesting, input.providing];
  for (const party of parties) {
    const name = party.name.trim();
    if (!name) continue;
    const branch = compactRomaneioText(party.branch) ?? "";
    await db.insert(romaneioParties).values({
      name,
      normalizedName: normalizeRomaneioCatalogValue(name),
      branch,
      normalizedBranch: normalizeRomaneioCatalogValue(branch),
      address: compactRomaneioText(party.address),
      neighborhood: compactRomaneioText(party.neighborhood),
    }).onConflictDoUpdate({
      target: [romaneioParties.normalizedName, romaneioParties.normalizedBranch],
      set: {
        name,
        branch,
        address: compactRomaneioText(party.address),
        neighborhood: compactRomaneioText(party.neighborhood),
        updatedAt: new Date(),
      },
    });
  }

  for (const item of input.items) {
    const code = compactRomaneioText(item.productCode);
    if (!code) continue;
    const description = item.productName.trim();
    await db.insert(romaneioProducts).values({
      code,
      normalizedCode: normalizeRomaneioCatalogValue(code),
      description,
      unit: compactRomaneioText(item.unit)?.toUpperCase() ?? "UN",
    }).onConflictDoUpdate({
      target: romaneioProducts.normalizedCode,
      set: {
        code,
        description,
        unit: compactRomaneioText(item.unit)?.toUpperCase() ?? "UN",
        updatedAt: new Date(),
      },
    });
  }
}

export async function listRomaneioParties() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(romaneioParties).orderBy(desc(romaneioParties.updatedAt)).limit(500);
}

export async function listRomaneioProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(romaneioProducts).orderBy(desc(romaneioProducts.updatedAt)).limit(500);
}

export async function createRomaneioDocument(createdByUserId: number, input: RomaneioDocumentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const shareToken = randomUUID().replace(/-/g, "");
  await persistRomaneioCatalogs(db, input);
  const [createdRomaneio] = await db.insert(romaneios).values({
    createdByUserId,
    shareToken,
    status: "shared",
    documentNumber: input.invoiceNumber.trim(),
    transferDate: input.transferDate,
    originName: input.providing.name.trim(),
    originBranch: compactRomaneioText(input.providing.branch),
    originAddress: compactRomaneioText(input.providing.address),
    originNeighborhood: compactRomaneioText(input.providing.neighborhood),
    originManagerName: input.providing.name.trim(),
    destinationName: input.requesting.name.trim(),
    destinationBranch: compactRomaneioText(input.requesting.branch),
    destinationAddress: compactRomaneioText(input.requesting.address),
    destinationNeighborhood: compactRomaneioText(input.requesting.neighborhood),
    destinationManagerName: input.requesting.name.trim(),
  }).returning({ id: romaneios.id });
  const romaneioId = createdRomaneio?.id;
  if (!romaneioId) throw new Error("Não foi possível criar o romaneio.");
  await db.insert(romaneioItems).values(input.items.map((item, index) => ({
    romaneioId,
    position: index + 1,
    productCode: compactRomaneioText(item.productCode),
    productName: item.productName.trim(),
    unit: compactRomaneioText(item.unit)?.toUpperCase() ?? "UN",
    requestedQuantity: 0,
    approvedQuantity: 0,
    deliveredQuantity: 0,
  })));
  return getRomaneioDocumentForOwner(createdByUserId, romaneioId);
}

export async function listRomaneioDocuments(createdByUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(romaneios).where(eq(romaneios.createdByUserId, createdByUserId)).orderBy(desc(romaneios.updatedAt));
}

export async function getRomaneioDocumentForOwner(createdByUserId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [document] = await db.select().from(romaneios).where(and(eq(romaneios.id, id), eq(romaneios.createdByUserId, createdByUserId))).limit(1);
  if (!document) throw new Error("Romaneio não encontrado.");
  const items = await db.select().from(romaneioItems).where(eq(romaneioItems.romaneioId, document.id)).orderBy(asc(romaneioItems.position));
  return romaneioDetail(db, document, items);
}

export async function getSharedRomaneioDocument(shareToken: string) {
  const db = await getDb();
  if (!db) return null;
  const [document] = await db.select().from(romaneios).where(eq(romaneios.shareToken, shareToken)).limit(1);
  if (!document) return null;
  const items = await db.select().from(romaneioItems).where(eq(romaneioItems.romaneioId, document.id)).orderBy(asc(romaneioItems.position));
  return romaneioDetail(db, document, items);
}

export async function signSharedRomaneioDocument(shareToken: string, signer: "origin" | "destination", dataUrl: string, signatureStyle: RomaneioSignatureStyle) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Envie a assinatura em JPG, PNG ou WEBP.");
  const binary = Buffer.from(match[2], "base64");
  if (binary.length === 0 || binary.length > 1024 * 1024) throw new Error("A assinatura deve ter no máximo 1 MB.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [document] = await db.select().from(romaneios).where(eq(romaneios.shareToken, shareToken)).limit(1);
  if (!document) throw new Error("Romaneio não encontrado.");
  if (document.originSignedAt && document.destinationSignedAt) throw new Error("Este Romaneio já recebeu as duas assinaturas.");
  if (document.originSignedAt && signer !== "destination") throw new Error("A próxima assinatura deve ser do gerente que solicita.");
  if (document.destinationSignedAt && signer !== "origin") throw new Error("A próxima assinatura deve ser do gerente que fornece.");
  const alreadySigned = signer === "origin" ? document.originSignedAt : document.destinationSignedAt;
  if (alreadySigned) throw new Error("Esta assinatura já foi registrada.");
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  const uploaded = await storagePut(`romaneios/${document.id}/signatures/${signer}-${randomUUID()}.${extension}`, binary, match[1]);
  const signedAt = new Date();
  const originSignedAt = signer === "origin" ? signedAt : document.originSignedAt;
  const destinationSignedAt = signer === "destination" ? signedAt : document.destinationSignedAt;
  const signerParty = partyForRomaneioSigner(document, signer);
  const managerName = signer === "origin" ? document.originManagerName : document.destinationManagerName;
  const branch = compactRomaneioText(signerParty.branch) ?? "";
  const preferredSignatureStyle = signatureStyle === "manual" ? undefined : signatureStyle;
  await db.insert(romaneioParties).values({
    name: signerParty.name,
    normalizedName: normalizeRomaneioCatalogValue(signerParty.name),
    branch,
    normalizedBranch: normalizeRomaneioCatalogValue(branch),
    address: compactRomaneioText(signerParty.address),
    neighborhood: compactRomaneioText(signerParty.neighborhood),
    preferredSignatureStyle,
  }).onConflictDoUpdate({ target: [romaneioParties.normalizedName, romaneioParties.normalizedBranch], set: { ...(preferredSignatureStyle ? { preferredSignatureStyle } : {}), updatedAt: signedAt } });
  await db.update(romaneios).set({
    ...(signer === "origin" ? { originSignatureUrl: uploaded.url, originSignedAt: signedAt } : { destinationSignatureUrl: uploaded.url, destinationSignedAt: signedAt }),
    status: getRomaneioStatus(originSignedAt, destinationSignedAt),
  }).where(eq(romaneios.id, document.id));
  await db.insert(romaneioActivities).values({ romaneioId: document.id, signer, managerName, signatureStyle, occurredAt: signedAt });
  return getSharedRomaneioDocument(shareToken);
}

export async function saveRomaneioPdf(createdByUserId: number, id: number, dataUrl: string) {
  const match = /^data:application\/pdf[^,]*,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("O arquivo gerado precisa estar no formato PDF.");
  const binary = Buffer.from(match[1], "base64");
  if (binary.length === 0 || binary.length > 5 * 1024 * 1024) throw new Error("O PDF deve ter no máximo 5 MB.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [document] = await db.select({ id: romaneios.id, documentNumber: romaneios.documentNumber }).from(romaneios).where(and(eq(romaneios.id, id), eq(romaneios.createdByUserId, createdByUserId))).limit(1);
  if (!document) throw new Error("Romaneio não encontrado.");
  const safeInvoice = (document.documentNumber || `romaneio-${id}`).replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80);
  const uploaded = await storagePut(`romaneios/${id}/pdf/romaneio-${safeInvoice}-${randomUUID()}.pdf`, binary, "application/pdf");
  await db.update(romaneios).set({ pdfUrl: uploaded.url }).where(eq(romaneios.id, id));
  return getRomaneioDocumentForOwner(createdByUserId, id);
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

export type LocalUserInput = Omit<ProfileInput, "email"> & { username: string; password: string; email?: string };

export async function createLocalUser(input: LocalUserInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const email = (input.email?.trim().toLowerCase() || `${username}@local.meufiado.invalid`);
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error("O usuário deve ter de 3 a 80 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.");
  const [existingCredential] = await db.select({ id: userCredentials.id }).from(userCredentials).where(eq(userCredentials.username, username)).limit(1);
  if (existingCredential) throw new Error("Este nome de usuário já está em uso.");
  const [existingProfile] = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (existingProfile?.userId) throw new Error("Já existe uma conta vinculada a este e-mail.");
  await assertDatabaseBranchRoleSlotAvailable(db, input.branchId, input.operatorType, existingProfile?.id);
  await db.insert(users).values({ openId: `local-user-${randomUUID()}`, name: input.fullName, email, loginMethod: "password", role: "user", lastSignedIn: new Date() });
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error("Não foi possível criar a conta do operador.");
  await db.insert(userProfiles).values({ userId: user.id, fullName: input.fullName, email, branchId: input.branchId, phone: input.phone, instagram: input.instagram || null, operatorType: input.operatorType, profileComplete: true });
  await db.insert(userCredentials).values({ userId: user.id, username, passwordHash: await hashPassword(input.password), mustChangePassword: true });
  return { userId: user.id, username };
}

export async function loginLocalUser(usernameInput: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = usernameInput.trim().toLowerCase();
  const result = await db
    .select({ user: users, credential: userCredentials, profile: userProfiles })
    .from(userCredentials)
    .innerJoin(users, eq(userCredentials.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(userCredentials.username, username))
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

export const DEFAULT_APP_TEXT_SETTINGS = {
  appName: "Meu Fiado",
  slogan: "Acompanhando de perto suas metas todos dias.",
  welcomeTitle: "Acompanhe suas metas de recebimento",
  welcomeDescription: "Tenha uma visão clara das metas, indicadores e resultados da sua filial.",
  overviewTitle: "Visão Geral",
  overviewDescription: "Confira o desempenho e a projeção do seu recebimento.",
  utilitiesTitle: "Utilidades",
  utilitiesDescription: "Arquivos, relatórios e ferramentas para apoiar sua rotina.",
  subscriptionTitle: "Plano",
  subscriptionDescription: "Gerencie seu acesso e envie o comprovante após o pagamento.",
  navOverview: "Visão Geral",
  navBranches: "Filiais",
  navHistory: "Históricos",
  navUtilities: "Utilidades",
  navChat: "Chat",
  navSettings: "Ajustes",
  navPreferences: "Preferências",
  navAccount: "Conta",
} as const;

export type AppTextSettingsInput = { [K in keyof typeof DEFAULT_APP_TEXT_SETTINGS]: string };

export async function getAppTextSettings() {
  const db = await getDb();
  if (!db) return { id: 0, ...DEFAULT_APP_TEXT_SETTINGS, updatedAt: new Date(0) };

  const existing = await db.select().from(appTextSettings).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(appTextSettings).values(DEFAULT_APP_TEXT_SETTINGS);
  const created = await db.select().from(appTextSettings).limit(1);
  return created[0] ?? { id: 0, ...DEFAULT_APP_TEXT_SETTINGS, updatedAt: new Date(0) };
}

export async function updateAppTextSettings(input: AppTextSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const existing = await db.select().from(appTextSettings).limit(1);
  if (existing[0]) {
    await db.update(appTextSettings).set(input).where(eq(appTextSettings.id, existing[0].id));
  } else {
    await db.insert(appTextSettings).values(input);
  }
  return getAppTextSettings();
}

export const DEFAULT_MAINTENANCE_SETTINGS = {
  enabled: false,
  title: "Estamos em manutenção",
  message: "Estamos atualizando o Meu Fiado para entregar uma experiência melhor. Voltaremos em breve.",
  imageUrl: null,
  primaryLabel: "Falar com a administração",
  primaryUrl: "/ajuda",
  secondaryLabel: "Tentar novamente",
  secondaryUrl: "/",
} as const;

export type MaintenanceSettingsInput = {
  enabled: boolean;
  title: string;
  message: string;
  imageUrl: string | null;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
};

export async function getMaintenanceSettings() {
  const db = await getDb();
  if (!db) return { id: 0, ...DEFAULT_MAINTENANCE_SETTINGS, updatedAt: new Date(0) };
  const existing = await db.select().from(maintenanceSettings).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(maintenanceSettings).values(DEFAULT_MAINTENANCE_SETTINGS);
  const created = await db.select().from(maintenanceSettings).limit(1);
  return created[0] ?? { id: 0, ...DEFAULT_MAINTENANCE_SETTINGS, updatedAt: new Date(0) };
}

export async function updateMaintenanceSettings(input: MaintenanceSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(maintenanceSettings).limit(1);
  if (existing[0]) await db.update(maintenanceSettings).set({ ...input, updatedAt: new Date() }).where(eq(maintenanceSettings.id, existing[0].id));
  else await db.insert(maintenanceSettings).values(input);
  return getMaintenanceSettings();
}
