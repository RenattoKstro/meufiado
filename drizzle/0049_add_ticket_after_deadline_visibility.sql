ALTER TABLE "userProfiles"
  ADD COLUMN IF NOT EXISTS "showTicketGoalAfterDeadline" boolean NOT NULL DEFAULT false;
