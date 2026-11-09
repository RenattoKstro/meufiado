-- Permissões individuais de telas para criar acessos básicos personalizados.
ALTER TABLE public."users"
  ADD COLUMN IF NOT EXISTS "pageAccessJson" text NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public."users"."pageAccessJson" IS
  'JSON com as telas liberadas individualmente, por exemplo {"overview":true,"history":true}';
