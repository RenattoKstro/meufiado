import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  serial,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userPlanEnum = pgEnum("user_plan", ["free", "pro"]);
export const supportAvailabilityEnum = pgEnum("support_availability", ["available", "away", "busy"]);
export const operatorTypeEnum = pgEnum("operator_type", ["leader", "assistant"]);
export const colorModeEnum = pgEnum("color_mode", ["light", "dark"]);
export const colorPaletteEnum = pgEnum("color_palette", ["ocean", "forest", "sunset", "violet", "slate", "rose", "midnight", "citrus"]);
export const romaneioStatusEnum = pgEnum("romaneio_status", ["draft", "shared", "partially_signed", "signed"]);
export const romaneioActivitySigner = pgEnum("romaneio_signer", ["origin", "destination"]);
export const subscriptionProofStatusEnum = pgEnum("subscription_proof_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  plan: userPlanEnum("plan").default("free").notNull(),
  proExpiresAt: timestamp("proExpiresAt"),
  supportAvailability: supportAvailabilityEnum("supportAvailability").default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const appTextSettings = pgTable("appTextSettings", {
  id: serial("id").primaryKey(),
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 32 }),
    regional: varchar("regional", { length: 120 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("branches_name_unique").on(table.name), uniqueIndex("branches_code_unique").on(table.code)],
);


export const userProfiles = pgTable(
  "userProfiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").unique().references(() => users.id),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    branchId: integer("branchId").references(() => branches.id),
    phone: varchar("phone", { length: 32 }),
    instagram: varchar("instagram", { length: 120 }),
    avatarUrl: varchar("avatarUrl", { length: 2048 }),
    operatorType: operatorTypeEnum("operatorType").default("leader").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isOnVacation: boolean("isOnVacation").default(false).notNull(),
    showLostGoal: boolean("showLostGoal").default(false).notNull(),
    showTicketGoal: boolean("showTicketGoal").default(true).notNull(),
    showPossibleRewards: boolean("showPossibleRewards").default(true).notNull(),
    showRewardAmounts: boolean("showRewardAmounts").default(true).notNull(),
    messageNotificationsEnabled: boolean("messageNotificationsEnabled").default(true).notNull(),
    colorMode: colorModeEnum("colorMode").default("light").notNull(),
    colorPalette: colorPaletteEnum("colorPalette").default("ocean").notNull(),
    profileComplete: boolean("profileComplete").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("profiles_email_unique").on(table.email),
    uniqueIndex("profiles_branch_operator_unique").on(table.branchId, table.operatorType),
  ],
);

export const chatMessages = pgTable(
  "chatMessages",
  {
    id: serial("id").primaryKey(),
    senderUserId: integer("senderUserId").notNull().references(() => users.id),
    recipientUserId: integer("recipientUserId").references(() => users.id),
    supportTopic: varchar("supportTopic", { length: 120 }),
    body: varchar("body", { length: 1200 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("chat_messages_expiry_idx").on(table.expiresAt),
    index("chat_messages_private_idx").on(table.senderUserId, table.recipientUserId, table.createdAt),
  ],
);

export const supportConversations = pgTable(
  "supportConversations",
  {
    id: serial("id").primaryKey(),
    requesterUserId: integer("requesterUserId").notNull().references(() => users.id),
    adminUserId: integer("adminUserId").notNull().references(() => users.id),
    topic: varchar("topic", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("support_conversations_pair_unique").on(table.requesterUserId, table.adminUserId),
    index("support_conversations_admin_idx").on(table.adminUserId, table.updatedAt),
  ],
);

export const chatReadStates = pgTable(
  "chatReadStates",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().unique().references(() => users.id),
    lastReadMessageId: integer("lastReadMessageId").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);

export const utilityDownloads = pgTable(
  "utilityDownloads",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    fileType: varchar("fileType", { length: 32 }).notNull(),
    externalUrl: varchar("externalUrl", { length: 2048 }).notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdByUserId: integer("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("utility_downloads_visibility_idx").on(table.isVisible, table.isPinned, table.updatedAt)],
);

export const utilityReports = pgTable(
  "utilityReports",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdByUserId: integer("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("utility_reports_visibility_idx").on(table.isVisible, table.updatedAt)],
);

export const updateNotes = pgTable(
  "updateNotes",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 80 }).default("Geral").notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdByUserId: integer("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("update_notes_visibility_idx").on(table.isVisible, table.createdAt)],
);

export const updateReadStates = pgTable(
  "updateReadStates",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    lastReadUpdateId: integer("lastReadUpdateId").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);


export const romaneios = pgTable(
  "romaneios",
  {
    id: serial("id").primaryKey(),
    createdByUserId: integer("createdByUserId").notNull().references(() => users.id),
    shareToken: varchar("shareToken", { length: 96 }).notNull(),
    status: romaneioStatusEnum("romaneioStatus").default("draft").notNull(),
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
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("romaneios_share_token_unique").on(table.shareToken),
    index("romaneios_owner_updated_idx").on(table.createdByUserId, table.updatedAt),
    index("romaneios_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const romaneioItems = pgTable(
  "romaneioItems",
  {
    id: serial("id").primaryKey(),
    romaneioId: integer("romaneioId").notNull().references(() => romaneios.id),
    position: integer("position").notNull(),
    productCode: varchar("productCode", { length: 80 }),
    productName: varchar("productName", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 24 }).notNull().default("UN"),
    requestedQuantity: doublePrecision("requestedQuantity").default(0).notNull(),
    approvedQuantity: doublePrecision("approvedQuantity").default(0).notNull(),
    deliveredQuantity: doublePrecision("deliveredQuantity").default(0).notNull(),
    notes: varchar("notes", { length: 600 }),
  },
  table => [uniqueIndex("romaneio_items_position_unique").on(table.romaneioId, table.position), index("romaneio_items_document_idx").on(table.romaneioId)],
);

export const romaneioParties = pgTable(
  "romaneioParties",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    normalizedName: varchar("normalizedName", { length: 180 }).notNull(),
    branch: varchar("branch", { length: 120 }).notNull().default(""),
    normalizedBranch: varchar("normalizedBranch", { length: 120 }).notNull().default(""),
    address: varchar("address", { length: 255 }),
    neighborhood: varchar("neighborhood", { length: 120 }),
    preferredSignatureStyle: varchar("preferredSignatureStyle", { length: 32 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("romaneio_parties_name_branch_unique").on(table.normalizedName, table.normalizedBranch),
    index("romaneio_parties_recent_idx").on(table.updatedAt),
  ],
);

export const romaneioProducts = pgTable(
  "romaneioProducts",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    normalizedCode: varchar("normalizedCode", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 24 }).notNull().default("UN"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("romaneio_products_code_unique").on(table.normalizedCode), index("romaneio_products_recent_idx").on(table.updatedAt)],
);


export const romaneioActivities = pgTable(
  "romaneioActivities",
  {
    id: serial("id").primaryKey(),
    romaneioId: integer("romaneioId").notNull().references(() => romaneios.id),
    signer: romaneioActivitySigner("signer").notNull(),
    managerName: varchar("managerName", { length: 160 }).notNull(),
    signatureStyle: varchar("signatureStyle", { length: 32 }).notNull(),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [index("romaneio_activities_document_time_idx").on(table.romaneioId, table.occurredAt)],
);

export const adminCredentials = pgTable("adminCredentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique().references(() => users.id),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const userCredentials = pgTable("userCredentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique().references(() => users.id),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const metricSettings = pgTable("metricSettings", { // Escopo de métricas pessoais legadas
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique().references(() => users.id),
  portfolioTotal: doublePrecision("portfolioTotal").default(0).notNull(),
  monthOpening: doublePrecision("monthOpening").default(0).notNull(),
  dayOpening: doublePrecision("dayOpening").default(0).notNull(),
  currentOverdue: doublePrecision("currentOverdue").default(0).notNull(),
  creditGoal: doublePrecision("creditGoal").default(0).notNull(),
  challengeGoal: doublePrecision("challengeGoal").default(0).notNull(),
  lostGoal: doublePrecision("lostGoal").default(0).notNull(),
  lostReceived: doublePrecision("lostReceived").default(0).notNull(),
  workingDaysMode: varchar("workingDaysMode", { length: 12 }).default("automatic").notNull(),
  countToday: boolean("countToday").default(true).notNull(),
  includeSaturday: boolean("includeSaturday").default(true).notNull(),
  includeSunday: boolean("includeSunday").default(false).notNull(),
  workingDaysTotal: integer("workingDaysTotal").default(0).notNull(),
  workingDaysElapsed: integer("workingDaysElapsed").default(0).notNull(),
  ticketWorkingDaysRemaining: integer("ticketWorkingDaysRemaining").default(0).notNull(),
  manualHolidayDatesJson: text("manualHolidayDatesJson").notNull(),
  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),
  fiadoAtDay15Month: varchar("fiadoAtDay15Month", { length: 7 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const branchMetrics = pgTable("branchMetrics", { // Escopo de métricas compartilhadas por filial
  id: serial("id").primaryKey(),
  branchId: integer("branchId").notNull().unique().references(() => branches.id),
  portfolioTotal: doublePrecision("portfolioTotal").default(0).notNull(),
  monthOpening: doublePrecision("monthOpening").default(0).notNull(),
  dayOpening: doublePrecision("dayOpening").default(0).notNull(),
  creditGoal: doublePrecision("creditGoal").default(0).notNull(),
  challengeGoal: doublePrecision("challengeGoal").default(0).notNull(),
  currentOverdue: doublePrecision("currentOverdue").default(0).notNull(),
  monthlyLoss: doublePrecision("monthlyLoss").default(0).notNull(),
  lossSalesPercent: doublePrecision("lossSalesPercent").default(0).notNull(),
  lostGoal: doublePrecision("lostGoal").default(0).notNull(),
  lostReceived: doublePrecision("lostReceived").default(0).notNull(),
  workingDaysMode: varchar("workingDaysMode", { length: 12 }).default("automatic").notNull(),
  countToday: boolean("countToday").default(true).notNull(),
  includeSaturday: boolean("includeSaturday").default(true).notNull(),
  includeSunday: boolean("includeSunday").default(false).notNull(),
  workingDaysTotal: integer("workingDaysTotal").default(0).notNull(),
  workingDaysElapsed: integer("workingDaysElapsed").default(0).notNull(),
  ticketWorkingDaysRemaining: integer("ticketWorkingDaysRemaining").default(0).notNull(),
  manualHolidayDatesJson: text("manualHolidayDatesJson").notNull(),
  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),
  fiadoAtDay15Month: varchar("fiadoAtDay15Month", { length: 7 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Dados exclusivamente importados pelo administrador a partir da planilha Analítico.
// Esta tabela não participa das métricas editáveis pelos operadores de cada filial.
export const matrixMetrics = pgTable("matrixMetrics", {
  id: serial("id").primaryKey(),
  branchId: integer("branchId").notNull().unique().references(() => branches.id),
  creditGoal: doublePrecision("creditGoal").default(0).notNull(),
  challengeGoal: doublePrecision("challengeGoal").default(0).notNull(),
  received: doublePrecision("received").default(0).notNull(),
  delinquencyPercent: doublePrecision("delinquencyPercent").default(0).notNull(),
  creditEffectivenessPercent: doublePrecision("creditEffectivenessPercent").default(0).notNull(),
  challengeEffectivenessPercent: doublePrecision("challengeEffectivenessPercent").default(0).notNull(),
  ticketGoal: doublePrecision("ticketGoal").default(0).notNull(),
  ticketPercent: doublePrecision("ticketPercent").default(0).notNull(),
  ticketBonus: doublePrecision("ticketBonus").default(0).notNull(),
  monthlyLoss: doublePrecision("monthlyLoss").default(0).notNull(),
  lossSalesPercent: doublePrecision("lossSalesPercent").default(0).notNull(),
  lostGoal: doublePrecision("lostGoal").default(0).notNull(),
  lostReceived: doublePrecision("lostReceived").default(0).notNull(),
  lossEffectivenessPercent: doublePrecision("lossEffectivenessPercent").default(0).notNull(),
  amountReceivable: doublePrecision("amountReceivable").default(0).notNull(),
  overdueOpening: doublePrecision("overdueOpening").default(0).notNull(),
  portfolioTotal: doublePrecision("portfolioTotal").default(0).notNull(),
  receiptForecast: doublePrecision("receiptForecast").default(0).notNull(),
  closingForecast: doublePrecision("closingForecast").default(0).notNull(),
  closingForecastPercent: doublePrecision("closingForecastPercent").default(0).notNull(),
  accumulatedLossGoal: doublePrecision("accumulatedLossGoal").default(0).notNull(),
  accumulatedLossReceived: doublePrecision("accumulatedLossReceived").default(0).notNull(),
  accumulatedLossBalance: doublePrecision("accumulatedLossBalance").default(0).notNull(),
  previousDayGoal: doublePrecision("previousDayGoal").default(0).notNull(),
  dailyReceived: doublePrecision("dailyReceived").default(0).notNull(),
  previousDayDifference: doublePrecision("previousDayDifference").default(0).notNull(),
  accumulatedDifference: doublePrecision("accumulatedDifference").default(0).notNull(),
  redesignedDailyGoal: doublePrecision("redesignedDailyGoal").default(0).notNull(),
  challengeDailyReceivedJson: text("challengeDailyReceivedJson"),
  sales: doublePrecision("sales").default(0).notNull(),
  receiptDailyJson: text("receiptDailyJson"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Controle da última carga de cada aba do arquivo que alimenta a Matriz.
// Mantém a rastreabilidade da importação sem interferir nos dados operacionais das filiais.
export const matrixImportSources = pgTable("matrixImportSources", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 32 }).notNull().unique(),
  importedAt: timestamp("importedAt").notNull(),
  receivedRows: integer("receivedRows").default(0).notNull(),
  validRows: integer("validRows").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const receiptHistoryEntries = pgTable(
  "receiptHistoryEntries",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branchId").notNull().references(() => branches.id),
    entryDate: date("entryDate", { mode: "string" }).notNull(),
    receivedAmount: doublePrecision("receivedAmount").notNull(),
    monthOpening: doublePrecision("monthOpening").default(0).notNull(),
    creditGoal: doublePrecision("creditGoal").default(0).notNull(),
    challengeGoal: doublePrecision("challengeGoal").default(0).notNull(),
    currentOverdue: doublePrecision("currentOverdue").default(0).notNull(),
    delinquencyPercent: doublePrecision("delinquencyPercent").default(0).notNull(),
    previousMonthDifference: doublePrecision("previousMonthDifference").default(0).notNull(),
    createdByUserId: integer("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("receipt_history_branch_date_unique").on(table.branchId, table.entryDate),
    index("receipt_history_branch_date_idx").on(table.branchId, table.entryDate),
  ],
);

export const subscriptionSettings = pgTable("subscriptionSettings", {
  id: serial("id").primaryKey(),
  monthlyPrice: doublePrecision("monthlyPrice").default(0).notNull(),
  promotionOriginalPrice: doublePrecision("promotionOriginalPrice").default(0).notNull(),
  promotionPrice: doublePrecision("promotionPrice").default(0).notNull(),
  promotionBadge: varchar("promotionBadge", { length: 80 }).default("Oferta especial").notNull(),
  promotionTitle: varchar("promotionTitle", { length: 180 }).default("Plano PRO em oferta").notNull(),
  promotionDescription: varchar("promotionDescription", { length: 800 }).default("Aproveite o valor promocional para liberar todos os recursos PRO.").notNull(),
  promotionBackground: varchar("promotionBackground", { length: 24 }).default("emerald").notNull(),
  promotionCtaLabel: varchar("promotionCtaLabel", { length: 80 }).default("Assinar PRO com Mercado Pago").notNull(),
  planInfoTitle: varchar("planInfoTitle", { length: 180 }).default("Plano PRO do Meu Fiado").notNull(),
  planInfoDescription: varchar("planInfoDescription", { length: 800 }).default("Tenha acesso aos recursos avançados e acompanhe sua assinatura por aqui.").notNull(),
  planInfoBackground: varchar("planInfoBackground", { length: 24 }).default("sky").notNull(),
  planInfoCtaEnabled: boolean("planInfoCtaEnabled").default(false).notNull(),
  planInfoCtaLabel: varchar("planInfoCtaLabel", { length: 80 }).default("").notNull(),
  planInfoCtaUrl: varchar("planInfoCtaUrl", { length: 2048 }).default("").notNull(),
  pixKey: varchar("pixKey", { length: 255 }).default("").notNull(),
  pixCopyPaste: varchar("pixCopyPaste", { length: 2048 }).default("").notNull(),
  pixQrCodeUrl: varchar("pixQrCodeUrl", { length: 2048 }).default("").notNull(),
  pixReceiverName: varchar("pixReceiverName", { length: 25 }).default("MEU FIADO").notNull(),
  pixReceiverBank: varchar("pixReceiverBank", { length: 80 }).default("").notNull(),
  subscriberGoalMinimum: integer("subscriberGoalMinimum").default(0).notNull(),
  subscriberGoalCurrent: integer("subscriberGoalCurrent").default(0).notNull(),
  subscriberGoalContext: varchar("subscriberGoalContext", { length: 800 }).default("").notNull(),
  customPlansJson: text("customPlansJson").default("[]").notNull(),
  overviewPlan: userPlanEnum("overviewPlan").default("free").notNull(),
  matrixPlan: userPlanEnum("matrixPlan").default("pro").notNull(),
  branchesPlan: userPlanEnum("branchesPlan").default("pro").notNull(),
  historyPlan: userPlanEnum("historyPlan").default("pro").notNull(),
  utilitiesPlan: userPlanEnum("utilitiesPlan").default("pro").notNull(),
  chatPlan: userPlanEnum("chatPlan").default("pro").notNull(),
  metricsPlan: userPlanEnum("metricsPlan").default("free").notNull(),
  appearancePlan: userPlanEnum("appearancePlan").default("free").notNull(),
  helpPlan: userPlanEnum("helpPlan").default("free").notNull(),
  updatesPlan: userPlanEnum("updatesPlan").default("free").notNull(),
  updatedByUserId: integer("updatedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const subscriptionProofs = pgTable(
  "subscriptionProofs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id),
    proofUrl: varchar("proofUrl", { length: 2048 }).notNull(),
    status: subscriptionProofStatusEnum("status").default("pending").notNull(),
    reviewNote: varchar("reviewNote", { length: 600 }),
    reviewedByUserId: integer("reviewedByUserId").references(() => users.id),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("subscription_proofs_user_status_idx").on(table.userId, table.status, table.createdAt)],
);

// Assinaturas recorrentes iniciadas pelo Mercado Pago. A referência externa vincula
// a cobrança ao usuário sem expor dados pessoais ao provedor de pagamentos.
export const mercadoPagoSubscriptions = pgTable(
  "mercadoPagoSubscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().unique().references(() => users.id),
    externalReference: varchar("externalReference", { length: 120 }).notNull(),
    preapprovalId: varchar("preapprovalId", { length: 120 }),
    checkoutUrl: varchar("checkoutUrl", { length: 2048 }),
    providerStatus: varchar("providerStatus", { length: 48 }).notNull().default("pending"),
    amount: doublePrecision("amount").notNull(),
    currencyId: varchar("currencyId", { length: 3 }).notNull().default("BRL"),
    nextPaymentDate: timestamp("nextPaymentDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("mercado_pago_subscriptions_reference_unique").on(table.externalReference),
    uniqueIndex("mercado_pago_subscriptions_preapproval_unique").on(table.preapprovalId),
  ],
);

// Cada pagamento confirmado tem identificador único no Mercado Pago. Essa chave
// torna a confirmação do webhook idempotente, mesmo quando a notificação é reenviada.
export const mercadoPagoSubscriptionPayments = pgTable(
  "mercadoPagoSubscriptionPayments",
  {
    id: serial("id").primaryKey(),
    mercadoPagoSubscriptionId: integer("mercadoPagoSubscriptionId").notNull().references(() => mercadoPagoSubscriptions.id),
    userId: integer("userId").notNull().references(() => users.id),
    authorizedPaymentId: varchar("authorizedPaymentId", { length: 120 }).notNull(),
    paymentId: varchar("paymentId", { length: 120 }),
    paymentStatus: varchar("paymentStatus", { length: 48 }).notNull(),
    amount: doublePrecision("amount").notNull(),
    paidAt: timestamp("paidAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("mercado_pago_authorized_payment_unique").on(table.authorizedPaymentId),
    uniqueIndex("mercado_pago_payment_unique").on(table.paymentId),
    index("mercado_pago_subscription_payments_user_created_idx").on(table.userId, table.createdAt),
  ],
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
export type UpdateNote = typeof updateNotes.$inferSelect;
export type ReceiptHistoryEntry = typeof receiptHistoryEntries.$inferSelect;
export type SubscriptionSettings = typeof subscriptionSettings.$inferSelect;
export type SubscriptionProof = typeof subscriptionProofs.$inferSelect;
export type MercadoPagoSubscription = typeof mercadoPagoSubscriptions.$inferSelect;
export type MercadoPagoSubscriptionPayment = typeof mercadoPagoSubscriptionPayments.$inferSelect;
export type Romaneio = typeof romaneios.$inferSelect;
export type RomaneioItem = typeof romaneioItems.$inferSelect;
