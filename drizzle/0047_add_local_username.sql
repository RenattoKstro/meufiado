ALTER TABLE "userCredentials" ADD COLUMN IF NOT EXISTS "username" varchar(80);
UPDATE "userCredentials" SET "username" = 'user-' || "userId" WHERE "username" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_credentials_username_unique" ON "userCredentials" ("username");
