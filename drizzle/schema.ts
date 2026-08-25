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

export const appTextSettings = mysqlTable("appTextSettings", {
  id: int("id").autoincrement().primaryKey(),
  appName: varchar("appName", { length: 100 }).notNull().default("Meu Fiado"),
  slogan: varchar("slogan", { length: 240 }).notNull().default("Acompanhando de perto suas metas todos dias."),
  welcomeTitle: varchar("welcomeTitle", { length: 180 }).notNull().default("Acompanhe suas metas de recebimento"),
  welcomeDescription: varchar("welcomeDescription", { length: 600 }).notNull().default("Tenha uma visão clara das metas, indicadores e resultados da sua filial."),
  overviewTitle: varchar("overviewTitle", { length: 120 }).notNull().default("Visão Geral"),
  overviewDescription: varchar("overviewDescription", { length: 240 }).notNull().default("Confira o desempenho e a projeção do seu recebimento."),
  utilitiesTitle: varchar("utilitiesTitle", { length: 120 }).notNull().default("Utilidades"),
  utilitiesDescription: varchar("utilitiesDescription", { length: 240 }).notNull().default("Arquivos, relatórios e ferramentas para apoiar sua rotina."),
  subscriptionTitle: varchar("subscriptionTitle", { length: 120 }).notNull().default("Plano"),
  subscriptionDescription: varchar("subscriptionDescription", { length: 240 }).notNull().default("Gerencie seu acesso e envie o comprovante após o pagamento."),
  navOverview: varchar("navOverview", { length: 80 }).notNull().default("Visão Geral"),
  navBranches: varchar("navBranches", { length: 80 }).notNull().default("Filiais"),
  navHistory: varchar("navHistory", { length: 80 }).notNull().default("Históricos"),
  navUtilities: varchar("navUtilities", { length: 80 }).notNull().default("Utilidades"),
  navChat: varchar("navChat", { length: 80 }).notNull().default("Chat"),
  navSettings: varchar("navSettings", { length: 80 }).notNull().default("Ajustes"),
  navPreferences: varchar("navPreferences", { length: 80 }).notNull().default("Preferências"),
  navAccount: varchar("navAccount", { length: 80 }).notNull().default("Conta"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const colorPalette = mysqlEnum("colorPalette", ["ocean", "violet", "forest", "sunset", "rose", "midnight", "citrus", "slate"]);

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

export const romaneioStatus = mysqlEnum("romaneioStatus", ["draft", "shared", "partially_signed", "signed"]);

export const romaneios = mysqlTable(
  "romaneios",
  {
    id: int("id").autoincrement().primaryKey(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    shareToken: varchar("shareToken", { length: 96 }).notNull(),
    status: romaneioStatus.default("draft").notNull(),
    documentNumber: varchar("documentNumber", { length: 80 }),
    transferDate: date("transferDate", { mode: "string" }).notNull(),
    pdfUrl: varchar("pdfUrl", { length: 2048 }),
    originName: varchar("originName", { length: 180 }).notNull(),
    originBranch: varchar("originBranch", { length: 120 }),
    originAddress: varchar("originAddress", { length: 255 }),
    originNeighborhood: varchar("originNeighborhood", { length: 120 }),
    originCity: varchar("originCity", { length: 120 }),
    originState: varchar("originState", { length: 2 }),
    originManagerName: varchar("originManagerName", { length: 160 }).notNull(),
    originSignatureUrl: varchar("originSignatureUrl", { length: 2048 }),
    originSignedAt: timestamp("originSignedAt"),
    destinationName: varchar("destinationName", { length: 180 }).notNull(),
    destinationBranch: varchar("destinationBranch", { length: 120 }),
    destinationAddress: varchar("destinationAddress", { length: 255 }),
    destinationNeighborhood: varchar("destinationNeighborhood", { length: 120 }),
    destinationCity: varchar("destinationCity", { length: 120 }),
    destinationState: varchar("destinationState", { length: 2 }),
    destinationManagerName: varchar("destinationManagerName", { length: 160 }).notNull(),
    destinationSignatureUrl: varchar("destinationSignatureUrl", { length: 2048 }),
    destinationSignedAt: timestamp("destinationSignedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("romaneios_share_token_unique").on(table.shareToken),
    index("romaneios_owner_updated_idx").on(table.createdByUserId, table.updatedAt),
    index("romaneios_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const romaneioItems = mysqlTable(
  "romaneioItems",
  {
    id: int("id").autoincrement().primaryKey(),
    romaneioId: int("romaneioId").notNull().references(() => romaneios.id),
    position: int("position").notNull(),
    productCode: varchar("productCode", { length: 80 }),
    productName: varchar("productName", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 24 }).notNull().default("UN"),
    requestedQuantity: double("requestedQuantity").default(0).notNull(),
    approvedQuantity: double("approvedQuantity").default(0).notNull(),
    deliveredQuantity: double("deliveredQuantity").default(0).notNull(),
    notes: varchar("notes", { length: 600 }),
  },
  table => [uniqueIndex("romaneio_items_position_unique").on(table.romaneioId, table.position), index("romaneio_items_document_idx").on(table.romaneioId)],
);

export const romaneioParties = mysqlTable(
  "romaneioParties",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    normalizedName: varchar("normalizedName", { length: 180 }).notNull(),
    branch: varchar("branch", { length: 120 }).notNull().default(""),
    normalizedBranch: varchar("normalizedBranch", { length: 120 }).notNull().default(""),
    address: varchar("address", { length: 255 }),
    neighborhood: varchar("neighborhood", { length: 120 }),
    preferredSignatureStyle: varchar("preferredSignatureStyle", { length: 32 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("romaneio_parties_name_branch_unique").on(table.normalizedName, table.normalizedBranch),
    index("romaneio_parties_recent_idx").on(table.updatedAt),
  ],
);

export const romaneioProducts = mysqlTable(
  "romaneioProducts",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    normalizedCode: varchar("normalizedCode", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 24 }).notNull().default("UN"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("romaneio_products_code_unique").on(table.normalizedCode), index("romaneio_products_recent_idx").on(table.updatedAt)],
);

export const romaneioActivitySigner = mysqlEnum("romaneioActivitySigner", ["origin", "destination"]);

export const romaneioActivities = mysqlTable(
  "romaneioActivities",
  {
    id: int("id").autoincrement().primaryKey(),
    romaneioId: int("romaneioId").notNull().references(() => romaneios.id),
    signer: romaneioActivitySigner.notNull(),
    managerName: varchar("managerName", { length: 160 }).notNull(),
    signatureStyle: varchar("signatureStyle", { length: 32 }).notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [index("romaneio_activities_document_time_idx").on(table.romaneioId, table.occurredAt)],
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

// Dados exclusivamente importados pelo administrador a partir da planilha Analítico.
// Esta tabela não participa das métricas editáveis pelos operadores de cada filial.
export const matrixMetrics = mysqlTable("matrixMetrics", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull().unique().references(() => branches.id),
  creditGoal: double("creditGoal").default(0).notNull(),
  challengeGoal: double("challengeGoal").default(0).notNull(),
  currentOverdue: double("currentOverdue").default(0).notNull(),
  monthlyLoss: double("monthlyLoss").default(0).notNull(),
  lossSalesPercent: double("lossSalesPercent").default(0).notNull(),
  lostGoal: double("lostGoal").default(0).notNull(),
  lostReceived: double("lostReceived").default(0).notNull(),
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
export type Romaneio = typeof romaneios.$inferSelect;
export type RomaneioItem = typeof romaneioItems.$inferSelect;
