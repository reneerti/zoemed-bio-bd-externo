-- ============================================
-- CORREÇÃO DE SEGURANÇA: user_roles e patients
-- ============================================

-- 1. PROTEGER TABELA user_roles CONTRA MANIPULAÇÃO
-- Apenas admins podem modificar roles via Edge Function (service role)
-- Usuários normais não podem INSERT, UPDATE ou DELETE

-- Política para INSERT: apenas via service role (Edge Functions)
CREATE POLICY "Only service role can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (false);

-- Política para UPDATE: apenas via service role (Edge Functions)  
CREATE POLICY "Only service role can update roles"
ON public.user_roles FOR UPDATE
USING (false)
WITH CHECK (false);

-- Política para DELETE: apenas via service role (Edge Functions)
CREATE POLICY "Only service role can delete roles"
ON public.user_roles FOR DELETE
USING (false);

-- 2. MELHORAR POLÍTICAS DA TABELA patients
-- Remover políticas antigas que podem ser redundantes
DROP POLICY IF EXISTS "Authenticated users view own patient record" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users insert own patient record" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users update own patient record" ON public.patients;

-- Recriar com verificação mais restritiva
-- SELECT: usuário só vê seu próprio registro OU é master
CREATE POLICY "Users view own patient record or master views all"
ON public.patients FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR is_master(auth.uid())
  )
);

-- INSERT: usuário só pode criar registro para si mesmo OU master cria para qualquer um
CREATE POLICY "Users insert own patient record or master inserts any"
ON public.patients FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR is_master(auth.uid())
  )
);

-- UPDATE: usuário só pode atualizar seu próprio registro OU master atualiza qualquer um
CREATE POLICY "Users update own patient record or master updates any"
ON public.patients FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR is_master(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR is_master(auth.uid())
  )
);