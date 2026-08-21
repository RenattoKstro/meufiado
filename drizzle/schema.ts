import {
  boolean,
  date,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro"]).default("free").notNull(),
  proExpiresAt: timestamp("proExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const branches = mysqlTable(
  "branches",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 32 }),
    regional: varchar("regional", { length: 120 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("branches_name_unique").on(table.name), uniqueIndex("branches_code_unique").on(table.code)],
);

export const operatorType = mysqlEnum("operatorType", ["leader", "assistant"]);
export const colorMode = mysqlEnum("colorMode", ["light", "dark"]);
export const colorPalette = mysqlEnum("colorPalette", ["ocean", "violet", "forest", "sunset"]);

export const userProfiles = mysqlTable(
  "userProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").unique().references(() => users.id),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    branchId: int("branchId").references(() => branches.id),
    phone: varchar("phone", { length: 32 }),
    instagram: varchar("instagram", { length: 120 }),
    avatarUrl: varchar("avatarUrl", { length: 2048 }),
    operatorType: operatorType.default("leader").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isOnVacation: boolean("isOnVacation").default(false).notNull(),
    showLostGoal: boolean("showLostGoal").default(false).notNull(),
    colorMode: colorMode.default("light").notNull(),
    colorPalette: colorPalette.default("ocean").notNull(),
    profileComplete: boolean("profileComplete").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("profiles_email_unique").on(table.email),
    uniqueIndex("profiles_branch_operator_unique").on(table.branchId, table.operatorType),
  ],
);

export const chatMessages = mysqlTable(
  "chatMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    senderUserId: int("senderUserId").notNull().references(() => users.id),
    recipientUserId: int("recipientUserId").references(() => users.id),
    body: varchar("body", { length: 1200 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("chat_messages_expiry_idx").on(table.expiresAt),
    index("chat_messages_private_idx").on(table.senderUserId, table.recipientUserId, table.createdAt),
  ],
);

export const chatReadStates = mysqlTable(
  "chatReadStates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique().references(() => users.id),
    lastReadMessageId: int("lastReadMessageId").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
);

export const utilityDownloads = mysqlTable(
  "utilityDownloads",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    fileType: varchar("fileType", { length: 32 }).notNull(),
    externalUrl: varchar("externalUrl", { length: 2048 }).notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("utility_downloads_visibility_idx").on(table.isVisible, table.isPinned, table.updatedAt)],
);

export const utilityReports = mysqlTable(
  "utilityReports",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("utility_reports_visibility_idx").on(table.isVisible, table.updatedAt)],
);

export const adminCredentials = mysqlTable("adminCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userCredentials = mysqlTable("userCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const metricSettings = mysqlTable("metricSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  portfolioTotal: double("portfolioTotal").default(0).notNull(),
  monthOpening: double("monthOpening").default(0).notNull(),
  dayOpening: double("dayOpening").default(0).notNull(),
  currentOverdue: double("currentOverdue").default(0).notNull(),
  creditGoal: double("creditGoal").default(0).notNull(),
  challengeGoal: double("challengeGoal").default(0).notNull(),
  lostGoal: double("lostGoal").default(0).notNull(),
  lostReceived: double("lostReceived").default(0).notNull(),
  workingDaysMode: varchar("workingDaysMode", { length: 12 }).default("automatic").notNull(),
  workingDaysTotal: int("workingDaysTotal").default(0).notNull(),
  workingDaysElapsed: int("workingDaysElapsed").default(0).notNull(),
  ticketWorkingDaysRemaining: int("ticketWorkingDaysRemaining").default(0).notNull(),
  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const branchMetrics = mysqlTable("branchMetrics", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull().unique().references(() => branches.id),
  portfolioTotal: double("portfolioTotal").default(0).notNull(),
  monthOpening: double("monthOpening").default(0).notNull(),
  dayOpening: double("dayOpening").default(0).notNull(),
  creditGoal: double("creditGoal").default(0).notNull(),
  challengeGoal: double("challengeGoal").default(0).notNull(),
  currentOverdue: double("currentOverdue").default(0).notNull(),
  monthlyLoss: double("monthlyLoss").default(0).notNull(),
  lossSalesPercent: double("lossSalesPercent").default(0).notNull(),
  lostGoal: double("lostGoal").default(0).notNull(),
  lostReceived: double("lostReceived").default(0).notNull(),
  workingDaysMode: varchar("workingDaysMode", { length: 12 }).default("automatic").notNull(),
  workingDaysTotal: int("workingDaysTotal").default(0).notNull(),
  workingDaysElapsed: int("workingDaysElapsed").default(0).notNull(),
  ticketWorkingDaysRemaining: int("ticketWorkingDaysRemaining").default(0).notNull(),
  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const receiptHistoryEntries = mysqlTable(
  "receiptHistoryEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    branchId: int("branchId").notNull().references(() => branches.id),
    entryDate: date("entryDate", { mode: "string" }).notNull(),
    receivedAmount: double("receivedAmount").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("receipt_history_branch_date_unique").on(table.branchId, table.entryDate),
    index("receipt_history_branch_date_idx").on(table.branchId, table.entryDate),
  ],
);

export const subscriptionSettings = mysqlTable("subscriptionSettings", {
  id: int("id").autoincrement().primaryKey(),
  monthlyPrice: double("monthlyPrice").default(0).notNull(),
  pixKey: varchar("pixKey", { length: 255 }).default("").notNull(),
  pixCopyPaste: varchar("pixCopyPaste", { length: 2048 }).default("").notNull(),
  pixQrCodeUrl: varchar("pixQrCodeUrl", { length: 2048 }).default("").notNull(),
  pixReceiverName: varchar("pixReceiverName", { length: 25 }).default("MEU FIADO").notNull(),
  pixReceiverBank: varchar("pixReceiverBank", { length: 80 }).default("").notNull(),
  branchesPlan: mysqlEnum("branchesPlan", ["free", "pro"]).default("pro").notNull(),
  historyPlan: mysqlEnum("historyPlan", ["free", "pro"]).default("pro").notNull(),
  utilitiesPlan: mysqlEnum("utilitiesPlan", ["free", "pro"]).default("pro").notNull(),
  chatPlan: mysqlEnum("chatPlan", ["free", "pro"]).default("pro").notNull(),
  updatedByUserId: int("updatedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const subscriptionProofs = mysqlTable(
  "subscriptionProofs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    proofUrl: varchar("proofUrl", { length: 2048 }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    reviewNote: varchar("reviewNote", { length: 600 }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscription_proofs_user_status_idx").on(table.userId, table.status, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type MetricSettings = typeof metricSettings.$inferSelect;
export type BranchMetric = typeof branchMetrics.$inferSelect;
export type UserCredential = typeof userCredentials.$inferSelect;
export type UtilityDownload = typeof utilityDownloads.$inferSelect;
export type UtilityReport = typeof utilityReports.$inferSelect;
export type ReceiptHistoryEntry = typeof receiptHistoryEntries.$inferSelect;
export type SubscriptionSettings = typeof subscriptionSettings.$inferSelect;
export type SubscriptionProof = typeof subscriptionProofs.$inferSelect;
