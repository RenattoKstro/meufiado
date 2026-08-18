import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminCredentials,
  branchMetrics,
  branches,
  InsertUser,
  metricSettings,
  userProfiles,
  userCredentials,
  users,
} from "../drizzle/schema";
import { randomUUID } from "crypto";
import { ENV } from "./_core/env";
import { hashPassword, verifyPassword } from "./localAdminAuth";
import { normalizeBranchCode, type AnalyticImportRow, type BranchImportRow } from "../shared/importRules";

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

export async function listActiveBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
}

export async function listAllBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(branches.name);
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
    const profiles = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(eq(userProfiles.branchId, branch.id));
    for (const profile of profiles) {
      if (!profile.userId) continue;
      const userMetricValues = {
        creditGoal: row.creditGoal,
        challengeGoal: row.challengeGoal,
        currentOverdue: row.currentOverdue,
        lostGoal: row.lostGoal,
        lostReceived: row.lostReceived,
      };
      await db.insert(metricSettings).values({ userId: profile.userId, ...emptyMetrics, ...userMetricValues }).onDuplicateKeyUpdate({ set: userMetricValues });
    }
    imported += 1;
  }
  return { imported, unmatched };
}

export async function setBranchStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(branches).set({ isActive }).where(eq(branches.id, id));
}

export async function getMyProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ profile: userProfiles, branch: branches })
    .from(userProfiles)
    .innerJoin(branches, eq(userProfiles.branchId, branches.id))
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

export async function completeMyProfile(userId: number, input: ProfileInput) {
  const db = await getDb();
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
  await db.update(userProfiles).set(input).where(eq(userProfiles.userId, userId));
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
  workingDaysTotal: 0,
  workingDaysElapsed: 0,
  fiadoAtDay15: false,
};

export async function getMyMetrics(userId: number) {
  const db = await getDb();
  if (!db) return emptyMetrics;
  const result = await db.select().from(metricSettings).where(eq(metricSettings.userId, userId)).limit(1);
  if (result[0]) return result[0];
  const branchDefault = await db
    .select({ metrics: branchMetrics })
    .from(userProfiles)
    .innerJoin(branchMetrics, eq(userProfiles.branchId, branchMetrics.branchId))
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  if (!branchDefault[0]) return emptyMetrics;
  const { metrics } = branchDefault[0];
  return { ...emptyMetrics, creditGoal: metrics.creditGoal, challengeGoal: metrics.challengeGoal, currentOverdue: metrics.currentOverdue, lostGoal: metrics.lostGoal, lostReceived: metrics.lostReceived };
}

export async function saveMyMetrics(userId: number, input: typeof emptyMetrics) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(metricSettings).values({ userId, ...input }).onDuplicateKeyUpdate({ set: input });
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

export async function createPreRegisteredUser(input: ProfileInput & { password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email.toLowerCase();
  const existingProfile = await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1);
  if (existingProfile[0]?.userId) throw new Error("Já existe uma conta vinculada a este e-mail.");
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId = existingUser[0]?.id;
  if (!userId) {
    await db.insert(users).values({ openId: `local-${randomUUID()}`, name: input.fullName, email, loginMethod: "password", role: "user", lastSignedIn: new Date() });
    const created = await db.select().from(users).where(eq(users.email, email)).limit(1);
    userId = created[0]?.id;
  }
  if (!userId) throw new Error("Não foi possível criar a conta do operador.");
  const profileValues = { fullName: input.fullName, email, branchId: input.branchId, phone: input.phone, instagram: input.instagram || null, operatorType: input.operatorType, profileComplete: true } as const;
  if (existingProfile[0]) await db.update(userProfiles).set({ ...profileValues, userId }).where(eq(userProfiles.id, existingProfile[0].id));
  else await db.insert(userProfiles).values({ ...profileValues, userId });
  const passwordHash = await hashPassword(input.password);
  await db.insert(userCredentials).values({ userId, passwordHash, mustChangePassword: true }).onDuplicateKeyUpdate({ set: { passwordHash, mustChangePassword: true } });
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
