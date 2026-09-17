import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS tableName, TABLE_ROWS AS approximateRows FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
  );
  const results = [];
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table.tableName}\``);
    results.push({ tableName: table.tableName, approximateRows: Number(table.approximateRows ?? 0), exactRows: Number(rows[0]?.count ?? 0) });
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await connection.end();
}
