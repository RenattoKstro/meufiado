CREATE TABLE IF NOT EXISTS "mercadoPagoPixPayments" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL REFERENCES "users"("id"),
  "planId" varchar(120) NOT NULL,
  "externalReference" varchar(160) NOT NULL,
  "providerPaymentId" varchar(120),
  "status" varchar(48) DEFAULT 'pending' NOT NULL,
  "statusDetail" varchar(120),
  "amount" double precision NOT NULL,
  "currencyId" varchar(3) DEFAULT 'BRL' NOT NULL,
  "qrCode" text,
  "qrCodeBase64" text,
  "ticketUrl" varchar(2048),
  "dateOfExpiration" timestamp,
  "dateApproved" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mercado_pago_pix_reference_unique" ON "mercadoPagoPixPayments" ("externalReference");
CREATE UNIQUE INDEX IF NOT EXISTS "mercado_pago_pix_provider_payment_unique" ON "mercadoPagoPixPayments" ("providerPaymentId");
CREATE INDEX IF NOT EXISTS "mercado_pago_pix_user_created_idx" ON "mercadoPagoPixPayments" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "mercado_pago_pix_status_created_idx" ON "mercadoPagoPixPayments" ("status", "createdAt");
ALTER TABLE "mercadoPagoPixPayments" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mercadoPagoPixPayments' AND policyname = 'mercadoPagoPixPayments_service_role_all'
  ) THEN
    CREATE POLICY "mercadoPagoPixPayments_service_role_all" ON "mercadoPagoPixPayments" FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
