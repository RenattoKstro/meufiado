from pathlib import Path
path = Path('/home/ubuntu/painel-recebimentos/drizzle/schema.ts')
text = path.read_text()
text = text.replace('  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),\n  updatedAt: timestamp("updatedAt").defaultNow().notNull(),\n});\n\nexport const branchMetrics', '  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),\n  fiadoAtDay15Month: varchar("fiadoAtDay15Month", { length: 7 }),\n  updatedAt: timestamp("updatedAt").defaultNow().notNull(),\n});\n\nexport const branchMetrics', 1)
needle = '  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),\n  updatedAt: timestamp("updatedAt").defaultNow().notNull(),\n});\n\n// Dados exclusivamente importados'
replacement = '  fiadoAtDay15: boolean("fiadoAtDay15").default(false).notNull(),\n  fiadoAtDay15Month: varchar("fiadoAtDay15Month", { length: 7 }),\n  updatedAt: timestamp("updatedAt").defaultNow().notNull(),\n});\n\n// Dados exclusivamente importados'
if needle not in text:
    raise SystemExit('branch metrics insertion point not found')
text = text.replace(needle, replacement, 1)
path.write_text(text)
print('schema patched')
