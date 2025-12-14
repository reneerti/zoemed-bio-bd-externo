-- ============================================
-- CORREÇÃO DE SEGURANÇA: Tabelas patients e bioimpedance
-- ============================================

-- 1. REMOVER POLÍTICAS DUPLICADAS DA TABELA bioimpedance
DROP POLICY IF EXISTS "Users can view their own bioimpedance" ON public.bioimpedance;
DROP POLICY IF EXISTS "Users can view their own bioimpedance via patient" ON public.bioimpedance;
DROP POLICY IF EXISTS "Users can insert their own bioimpedance via patient" ON public.bioimpedance;

-- 2. CRIAR POLÍTICA CONSOLIDADA PARA SELECT (bioimpedance)
-- Usuários só podem ver registros vinculados ao seu patient_id
CREATE POLICY "Users can view own bioimpedance records"
ON public.bioimpedance FOR SELECT
USING (
  patient_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = bioimpedance.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- 3. CRIAR POLÍTICA SEGURA PARA INSERT (bioimpedance)
-- Usuários só podem inserir registros para seu próprio patient_id
-- Verificação dupla: patient_id deve corresponder ao user autenticado
CREATE POLICY "Users can insert own bioimpedance records"
ON public.bioimpedance FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND patient_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = bioimpedance.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- 4. ADICIONAR POLÍTICA DE UPDATE PARA USUÁRIOS (bioimpedance)
-- Usuários podem atualizar seus próprios registros
CREATE POLICY "Users can update own bioimpedance records"
ON public.bioimpedance FOR UPDATE
USING (
  patient_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = bioimpedance.patient_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  patient_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = bioimpedance.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- 5. GARANTIR QUE PATIENTS TENHA VERIFICAÇÃO DE AUTENTICAÇÃO
-- Remover política existente se houver e recriar com verificação explícita
DROP POLICY IF EXISTS "Users can view only their own patient record" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own patient record" ON public.patients;
DROP POLICY IF EXISTS "Users can update only their own patient record" ON public.patients;

-- Recriar com verificação explícita de auth.uid() IS NOT NULL
CREATE POLICY "Authenticated users view own patient record"
ON public.patients FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

CREATE POLICY "Authenticated users insert own patient record"
ON public.patients FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

CREATE POLICY "Authenticated users update own patient record"
ON public.patients FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);