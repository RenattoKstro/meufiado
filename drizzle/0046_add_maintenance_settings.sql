CREATE TABLE IF NOT EXISTS "maintenanceSettings" (
  "id" serial PRIMARY KEY NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "title" varchar(180) NOT NULL DEFAULT 'Estamos em manutenção',
  "message" text NOT NULL DEFAULT 'Estamos atualizando o Meu Fiado para entregar uma experiência melhor. Voltaremos em breve.',
  "imageUrl" text,
  "primaryLabel" varchar(80) NOT NULL DEFAULT 'Falar com a administração',
  "primaryUrl" varchar(500) NOT NULL DEFAULT '/ajuda',
  "secondaryLabel" varchar(80) NOT NULL DEFAULT 'Tentar novamente',
  "secondaryUrl" varchar(500) NOT NULL DEFAULT '/',
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
