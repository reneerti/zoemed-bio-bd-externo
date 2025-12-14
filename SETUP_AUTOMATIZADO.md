# 🚀 ZOEMED_BIO - Script de Setup Automatizado

## Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Rápida (5 minutos)](#configuração-rápida)
3. [Configuração Manual Detalhada](#configuração-manual-detalhada)
4. [Verificação](#verificação)
5. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Contas Necessárias
- [ ] Conta Lovable (lovable.dev)
- [ ] Conta GitHub (opcional, para versionamento)

### Ferramentas Locais (opcional)
- Node.js 18+
- Git

---

## Configuração Rápida

### Passo 1: Criar Projeto no Lovable
1. Acesse [lovable.dev](https://lovable.dev)
2. Clique em "New Project"
3. Escolha "Blank Project" ou importe do GitHub

### Passo 2: Habilitar Lovable Cloud
1. No projeto, clique em "Settings" (⚙️)
2. Vá em "Connectors"
3. Clique em "Enable Lovable Cloud"
4. Aguarde a configuração automática (~30 segundos)

### Passo 3: Executar Migrations
Cole o conteúdo do arquivo `SETUP_DATABASE.sql` no chat do Lovable com a mensagem:
```
Execute esta migration no banco de dados
```

### Passo 4: Importar Código
Se estiver recriando de um repositório GitHub:
1. Settings → GitHub → Connect Repository
2. Selecione o repositório com o código

### Passo 5: Configurar Usuário Master
No chat do Lovable, peça:
```
Crie um usuário admin com email: seu-email@exemplo.com
```

---

## Configuração Manual Detalhada

### 1. Estrutura do Banco de Dados

Execute as migrations na ordem correta. O arquivo `SETUP_DATABASE.sql` contém tudo consolidado.

#### 1.1 Criar Enums
```sql
-- Tipos de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');
CREATE TYPE public.user_person AS ENUM ('reneer', 'ana_paula');
```

#### 1.2 Criar Tabelas (ordem de dependência)

**Tabela: patients** (base para todas as outras)
```sql
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    created_by UUID,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gender TEXT,
    birth_date DATE,
    height NUMERIC,
    address TEXT,
    medical_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Tabela: user_roles** (controle de acesso)
```sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);
```

**Tabela: bioimpedance** (dados principais)
```sql
CREATE TABLE public.bioimpedance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    user_person user_person NOT NULL,
    measurement_date DATE NOT NULL,
    weight NUMERIC,
    bmi NUMERIC,
    body_fat_percent NUMERIC,
    fat_mass NUMERIC,
    lean_mass NUMERIC,
    muscle_mass NUMERIC,
    muscle_rate_percent NUMERIC,
    skeletal_muscle_percent NUMERIC,
    bone_mass NUMERIC,
    protein_mass NUMERIC,
    protein_percent NUMERIC,
    body_water_percent NUMERIC,
    moisture_content NUMERIC,
    subcutaneous_fat_percent NUMERIC,
    visceral_fat NUMERIC,
    bmr INTEGER,
    metabolic_age INTEGER,
    whr NUMERIC,
    status TEXT,
    monjaro_dose NUMERIC,
    week_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Demais tabelas:** Ver `SETUP_DATABASE.sql` para a lista completa.

### 2. Funções do Banco de Dados

#### 2.1 Função de Verificação de Role
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### 2.2 Função de Verificação Master
```sql
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;
```

### 3. Políticas RLS

#### 3.1 Habilitar RLS em todas as tabelas
```sql
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance ENABLE ROW LEVEL SECURITY;
-- ... demais tabelas
```

#### 3.2 Políticas de Exemplo
```sql
-- Pacientes: usuário vê apenas seu próprio registro
CREATE POLICY "Users can view only their own patient record"
ON public.patients FOR SELECT
USING (user_id = auth.uid());

-- Master pode ver todos
CREATE POLICY "Master can view all patients"
ON public.patients FOR SELECT
USING (is_master(auth.uid()));
```

### 4. Storage Buckets

```sql
-- Criar bucket para imagens de bioimpedância
INSERT INTO storage.buckets (id, name, public)
VALUES ('bioimpedance-images', 'bioimpedance-images', false);

-- Política de upload (usuário autenticado)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bioimpedance-images');
```

### 5. Edge Functions

As Edge Functions são implantadas automaticamente pelo Lovable. Arquivos necessários:

```
supabase/
├── config.toml          # Configuração das funções
└── functions/
    ├── generate-analysis/
    │   └── index.ts     # Análise IA
    ├── process-bioimpedance/
    │   └── index.ts     # OCR básico
    ├── process-bioimpedance-v2/
    │   └── index.ts     # OCR avançado com fallback
    ├── manage-api-keys/
    │   └── index.ts     # Gerenciamento de API keys
    ├── create-user-account/
    │   └── index.ts     # Criação de contas
    ├── update-user-password/
    │   └── index.ts     # Atualização de senhas
    └── update-user-role/
        └── index.ts     # Atualização de roles
```

### 6. Variáveis de Ambiente

Configuradas automaticamente pelo Lovable Cloud:
- `VITE_SUPABASE_URL` - URL do projeto
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Chave pública
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (Edge Functions)
- `LOVABLE_API_KEY` - API Gateway IA (automático)

---

## Verificação

### Checklist de Verificação

#### Banco de Dados
- [ ] Todas as tabelas criadas
- [ ] Enums funcionando
- [ ] RLS habilitado em todas as tabelas
- [ ] Funções is_master e has_role funcionando

#### Autenticação
- [ ] Signup funcionando
- [ ] Login funcionando
- [ ] Usuário master criado e com role 'admin'

#### Edge Functions
- [ ] generate-analysis respondendo
- [ ] process-bioimpedance-v2 respondendo
- [ ] manage-api-keys respondendo

#### Storage
- [ ] Bucket bioimpedance-images criado
- [ ] Upload de imagens funcionando

### Comandos de Verificação (SQL)

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar usuário master
SELECT u.email, r.role 
FROM auth.users u 
JOIN public.user_roles r ON u.id = r.user_id 
WHERE r.role = 'admin';
```

---

## Troubleshooting

### Problema: RLS bloqueando acesso
**Solução:** Verificar se o usuário tem role correto
```sql
SELECT * FROM public.user_roles WHERE user_id = 'UUID_DO_USUARIO';
```

### Problema: Edge Function não encontrada
**Solução:** Verificar config.toml
```toml
[functions.nome-da-funcao]
verify_jwt = true
```

### Problema: Upload de imagem falhando
**Solução:** Verificar políticas do bucket
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'bioimpedance-images';
```

### Problema: Análise IA não funcionando
**Solução:** Verificar se LOVABLE_API_KEY está configurada
- Lovable Cloud configura automaticamente
- Para Supabase externo, adicionar manualmente em Edge Function Secrets

---

## Scripts Úteis

### Criar Primeiro Usuário Master
```sql
-- Após o usuário fazer signup, execute:
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'
);
```

### Recalcular Todos os Scores
```sql
SELECT public.calculate_patient_score(id) FROM public.patients;
SELECT public.update_leaderboard_rankings();
```

### Limpar Dados de Teste
```sql
-- CUIDADO: Remove todos os dados!
TRUNCATE public.bioimpedance CASCADE;
TRUNCATE public.ai_analysis_history CASCADE;
TRUNCATE public.notifications CASCADE;
```

---

## Tempo Estimado de Setup

| Etapa | Tempo |
|-------|-------|
| Criar projeto Lovable | 1 min |
| Habilitar Cloud | 1 min |
| Executar migrations | 2 min |
| Verificar funcionamento | 1 min |
| **Total** | **~5 min** |

---

## Contato e Suporte

- Documentação Lovable: [docs.lovable.dev](https://docs.lovable.dev)
- Documentação Supabase: [supabase.com/docs](https://supabase.com/docs)
