from pathlib import Path
p = Path('/home/ubuntu/painel-recebimentos/server/db.ts')
s = p.read_text()
old = 'function metricsForClient(values: PersistedMetrics): MetricsInput {\n  return applyWorkingDaysMode({'
new = 'function currentBrazilMonth() {\n  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());\n  return `${parts.find(part => part.type === "year")?.value ?? ""}-${parts.find(part => part.type === "month")?.value ?? ""}`;\n}\n\nfunction metricsForClient(values: PersistedMetrics): MetricsInput {\n  return applyWorkingDaysMode({'
if old not in s: raise SystemExit('metrics function not found')
s = s.replace(old, new, 1)
s = s.replace('values.fiadoAtDay15Month === new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7)', 'values.fiadoAtDay15Month === currentBrazilMonth()', 1)
p.write_text(s)
print('brazil month patched')
