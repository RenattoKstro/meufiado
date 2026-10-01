ALTER TABLE "subscriptionSettings" ADD COLUMN IF NOT EXISTS "customPlansJson" text NOT NULL DEFAULT '[]';
