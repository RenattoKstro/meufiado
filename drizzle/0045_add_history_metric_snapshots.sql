ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "monthOpening" double precision NOT NULL DEFAULT 0;
ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "creditGoal" double precision NOT NULL DEFAULT 0;
ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "challengeGoal" double precision NOT NULL DEFAULT 0;
ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "currentOverdue" double precision NOT NULL DEFAULT 0;
ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "delinquencyPercent" double precision NOT NULL DEFAULT 0;
ALTER TABLE "receiptHistoryEntries" ADD COLUMN IF NOT EXISTS "previousMonthDifference" double precision NOT NULL DEFAULT 0;
