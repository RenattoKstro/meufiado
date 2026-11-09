-- Permissões individuais de telas para criar acessos básicos personalizados.
ALTER TABLE public."users"
  ADD COLUMN IF NOT EXISTS "pageAccessJson" text NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public."users"."pageAccessJson" IS
  'JSON com as telas liberadas individualmente, por exemplo {"overview":true,"history":true}';

-- A escrita é permitida somente a administradores autenticados.
-- app_is_admin() é uma função SECURITY DEFINER já existente no projeto e evita recursão de RLS.
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_admin_update_page_access" ON public."users";
CREATE POLICY "users_admin_update_page_access" ON public."users"
  FOR UPDATE TO authenticated
  USING (app_is_admin())
  WITH CHECK (app_is_admin());
