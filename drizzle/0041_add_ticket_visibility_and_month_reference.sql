ALTER TABLE "userProfiles" ADD COLUMN IF NOT EXISTS "showTicketGoal" boolean NOT NULL DEFAULT true;
ALTER TABLE "userProfiles" ADD COLUMN IF NOT EXISTS "showPossibleRewards" boolean NOT NULL DEFAULT true;
ALTER TABLE "metricSettings" ADD COLUMN IF NOT EXISTS "fiadoAtDay15Month" varchar(7);
ALTER TABLE "branchMetrics" ADD COLUMN IF NOT EXISTS "fiadoAtDay15Month" varchar(7);
