import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '__drizzle_migrations' ORDER BY TABLE_NAME",
  );
  const dump = { generatedAt: new Date().toISOString(), tables: {} };
  for (const { tableName } of tables) {
    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    dump.tables[tableName] = rows;
  }
  await fs.writeFile("migration/source-data.json", JSON.stringify(dump), "utf8");
  console.log(JSON.stringify({ tables: Object.keys(dump.tables).length, rows: Object.fromEntries(Object.entries(dump.tables).map(([name, rows]) => [name, rows.length])) }, null, 2));
} finally {
  await connection.end();
}
