import fs from "node:fs/promises";

const dump = JSON.parse(await fs.readFile("migration/source-data.json", "utf8"));
const order = [
  "users", "branches", "appTextSettings", "userProfiles", "adminCredentials", "userCredentials",
  "subscriptionSettings", "subscriptionProofs", "metricSettings", "branchMetrics", "matrixImportSources", "matrixMetrics",
  "chatMessages", "chatReadStates", "supportConversations", "updateNotes", "updateReadStates",
  "utilityDownloads", "utilityReports", "romaneios", "romaneioItems", "romaneioParties", "romaneioProducts", "romaneioActivities",
  "receiptHistoryEntries", "mercadoPagoSubscriptions", "mercadoPagoSubscriptionPayments",
];
const booleanColumns = new Set(["isActive", "isOnVacation", "showLostGoal", "messageNotificationsEnabled", "profileComplete", "isPinned", "isVisible", "fiadoAtDay15", "countToday", "includeSaturday", "includeSunday", "planInfoCtaEnabled", "mustChangePassword"]);
const quote = value => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  const text = String(value).replaceAll("'", "''");
  return `'${text}'`;
};
const statements = ["BEGIN;"];
for (const tableName of order) {
  const rows = dump.tables[tableName] ?? [];
  if (!rows.length) continue;
  const columns = Object.keys(rows[0]);
  for (const row of rows) {
    const values = columns.map(column => booleanColumns.has(column) && row[column] !== null ? (Number(row[column]) !== 0 ? "TRUE" : "FALSE") : quote(row[column]));
    statements.push(`INSERT INTO "${tableName}" (${columns.map(column => `"${column}"`).join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`);
  }
}
for (const tableName of order) {
  const rows = dump.tables[tableName] ?? [];
  if (!rows.length || !Object.prototype.hasOwnProperty.call(rows[0], "id")) continue;
  statements.push(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX("id") FROM "${tableName}"), 1), true);`);
}
statements.push("COMMIT;", "");
await fs.writeFile("migration/postgres-data.sql", statements.join("\n"), "utf8");
console.log(JSON.stringify({ statements: statements.length, bytes: Buffer.byteLength(statements.join("\n")) }, null, 2));
