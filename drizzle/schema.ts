import {
  boolean,
  double,
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
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("branches_name_unique").on(table.name)],
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
    branchId: int("branchId").notNull().references(() => branches.id),
    phone: varchar("phone", { length: 32 }).notNull(),
    instagram: varchar("instagram", { length: 120 }),
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
  table => [uniqueIndex("profiles_email_unique").on(table.email)],
);

export const adminCredentials = mysqlTable("adminCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
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
  workingDaysTotal: int("workingDaysTotal").default(0).notNull(),
  workingDaysElapsed: int("workingDaysElapsed").default(0).notNull(),
  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type MetricSettings = typeof metricSettings.$inferSelect;
