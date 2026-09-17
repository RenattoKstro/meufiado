import fs from "node:fs/promises";

const path = "drizzle/schema.ts";
const source = await fs.readFile(`${path}.mysql-backup`, "utf8");
let output = source
  .replace(/\bmysqlTable\b/g, "pgTable")
  .replace(/\bmysqlEnum\("[^"]+",\s*\[[^\]]*\]\)/g, 'varchar("__ENUM__", { length: 32 })')
  .replace(/\bdouble\b/g, "doublePrecision")
  .replace(/\bint\("id"\)\.autoincrement\(\)/g, 'serial("id")')
  .replace(/\bint\(/g, "integer(")
  .replace(/\.onUpdateNow\(\)/g, "");

// Shared enum builders in the MySQL schema are converted to inline varchar builders.
const sharedEnums = {
  supportAvailability: ["supportAvailability", 20],
  operatorType: ["operatorType", 20],
  colorMode: ["colorMode", 20],
  colorPalette: ["colorPalette", 20],
  romaneioStatus: ["romaneioStatus", 32],
  romaneioActivitySigner: ["romaneioActivitySigner", 20],
};
for (const [name, [column, length]] of Object.entries(sharedEnums)) {
  const declaration = new RegExp(`export const ${name} = varchar\\("__ENUM__", \\{ length: 32 \\}\\);\\n`, "g");
  output = output.replace(declaration, "");
  output = output.replace(new RegExp(`\\b${name}\\.default`, "g"), `varchar("${column}", { length: ${length} }).default`);
}

// Any remaining direct enum declaration after the generic conversion becomes a normal varchar column.
output = output.replace(/export const [A-Za-z0-9_]+ = varchar\("__ENUM__", \{ length: 32 \}\);\n/g, "");
output = output.replace(/\bsource: varchar\("__ENUM__", \{ length: 32 \}\)/g, 'source: varchar("source", { length: 32 })');
output = output.replace(/\bstatus: varchar\("__ENUM__", \{ length: 32 \}\)/g, 'status: varchar("status", { length: 32 })');
output = output.replace(/\b(role|plan|overviewPlan|matrixPlan|branchesPlan|historyPlan|utilitiesPlan|chatPlan|metricsPlan|appearancePlan|helpPlan|updatesPlan): varchar\("__ENUM__", \{ length: 32 \}\)/g, '$1: varchar("$1", { length: 32 })');

output = output.replace('} from "drizzle-orm/mysql-core";', '} from "drizzle-orm/pg-core";');
output = output.replace('  int,\n', '  integer,\n  serial,\n').replace('  mysqlEnum,\n', '').replace('  mysqlTable,\n', '  pgTable,\n').replace('  doublePrecision,\n', '  doublePrecision,\n');
if (!output.includes('  doublePrecision,\n')) {
  output = output.replace('  date,\n', '  date,\n  doublePrecision,\n');
}
await fs.writeFile(path, output, "utf8");
console.log("Converted schema to PostgreSQL-compatible pg-core schema");
