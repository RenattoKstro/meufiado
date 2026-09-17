import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '__drizzle_migrations' ORDER BY TABLE_NAME",
  );
  const ddl = [];
  for (const { tableName } of tables) {
    const [rows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    ddl.push(rows[0]["Create Table"] + ";\n");
  }
  await fs.writeFile("migration/source-ddl.sql", ddl.join("\n"), "utf8");
  console.log(`Exported ${ddl.length} table definitions`);
} finally {
  await connection.end();
}
