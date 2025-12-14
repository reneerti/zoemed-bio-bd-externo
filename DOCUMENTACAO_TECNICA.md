# DOCUMENTAÇÃO TÉCNICA - ZOEMED_BIO

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Edge Functions](#edge-functions)
4. [Banco de Dados](#banco-de-dados)
5. [Fluxos de Dados](#fluxos-de-dados)
6. [APIs e Integrações](#apis-e-integrações)
7. [Segurança](#segurança)
8. [Como Recriar o Projeto](#como-recriar)

---

## 🎯 VISÃO GERAL DO SISTEMA

O ZOEMED_BIO é um sistema de acompanhamento de bioimpedância e composição corporal com:
- Upload de imagens de relatórios Fitdays (OCR + IA)
- Análise automatizada com Inteligência Artificial
- Dashboard de evolução para pacientes
- Painel administrativo (Master) para gestão de pacientes
- Sistema de gamificação (leaderboard e scores)
- PWA com suporte offline

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Shadcn/UI
- **Backend**: Supabase (Lovable Cloud)
- **Edge Functions**: Deno (Supabase Functions)
- **IA**: Lovable AI Gateway (Google Gemini)
- **Storage**: Supabase Storage
- **Autenticação**: Supabase Auth

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Login/Auth  │ │ Dashboard   │ │ Master Dashboard        │ │
│  │ SignUp      │ │ Paciente    │ │ (Admin Only)            │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ Supabase Client SDK
┌─────────────────────────▼───────────────────────────────────┐
│                    SUPABASE (Backend)                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Auth (Users)    │  │ Database     │  │ Storage         │ │
│  │                 │  │ (PostgreSQL) │  │ (Images)        │ │
│  └─────────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┤
│  │                  EDGE FUNCTIONS                          │ │
│  │ • process-bioimpedance-v2  (OCR + Parser)               │ │
│  │ • generate-analysis        (IA Análise)                 │ │
│  │ • create-user-account      (Admin)                      │ │
│  │ • update-user-password     (Admin)                      │ │
│  │ • update-user-role         (Admin)                      │ │
│  │ • manage-api-keys          (Gerenciamento de Chaves)    │ │
│  │ • analyze-comparison       (Comparação de Pacientes)    │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│              LOVABLE AI GATEWAY (Externo)                    │
│  • https://ai.gateway.lovable.dev/v1/chat/completions       │
│  • Modelos: google/gemini-2.5-pro, gemini-2.5-flash        │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ EDGE FUNCTIONS

### 1. process-bioimpedance-v2 (Principal OCR)

**Arquivo**: `supabase/functions/process-bioimpedance-v2/index.ts`

**Propósito**: Processa imagens de relatórios Fitdays usando OCR + parser regex

**Entrada**:
```json
{
  "imageUrl": "https://storage.url/image.jpg",
  "patientId": "uuid-do-paciente",
  "skipAi": false
}
```

**Saída**:
```json
{
  "success": true,
  "extractedData": {
    "weight": 85.5,
    "bmi": 25.3,
    "body_fat_percent": 22.1,
    "muscle_mass": 35.2,
    ...
  },
  "insights": "Análise da IA...",
  "extractionMethod": "lovable_gateway",
  "processingTime": 2340
}
```

**Fluxo Interno**:
1. Busca provedores OCR configurados (por prioridade)
2. Tenta OCR com fallback automático:
   - `lovable_gateway` → Gemini Vision
   - `google_vision` → Google Vision API
   - `regex_only` → Sem OCR
3. Parser regex extrai dados do texto
4. Calcula campos derivados (fat_mass, lean_mass)
5. Salva em `raw_ocr_extractions`
6. Gera insights com IA (se habilitado)

**Dependências**:
- `LOVABLE_API_KEY` (Supabase Secret)
- Tabela `api_configurations` (provedores)
- Tabela `raw_ocr_extractions` (logs)
- Tabela `api_usage_logs` (métricas)

---

### 2. process-bioimpedance (Legacy)

**Arquivo**: `supabase/functions/process-bioimpedance/index.ts`

**Propósito**: Versão anterior do OCR (fallback)

**Entrada**:
```json
{
  "imageUrl": "https://storage.url/image.jpg",
  "userPerson": "reneer" | "ana_paula"
}
```

**Nota**: Mantido para compatibilidade. Usa diretamente Gemini Vision sem fallback.

---

### 3. generate-analysis (Análise IA)

**Arquivo**: `supabase/functions/generate-analysis/index.ts`

**Propósito**: Gera análise completa do histórico do paciente

**Entrada**:
```json
{
  "patientId": "uuid-do-paciente",
  "userPerson": "reneer"
}
```

**Saída**:
```json
{
  "insights": "## 📊 Resumo da Evolução...",
  "summary": {
    "totalMeasurements": 15,
    "weightChange": "-5.3",
    "fatChange": "-3.2",
    "muscleChange": "+1.1",
    "currentWeight": "80.2",
    "currentBmi": "24.1",
    "currentFat": "18.9"
  }
}
```

**Fluxo**:
1. Busca todo histórico de bioimpedância do paciente
2. Calcula tendências (primeiro vs último registro)
3. Envia para Gemini 2.5 Pro (análise detalhada)
4. Gera resumo com Gemini 2.5 Flash Lite
5. Salva em `ai_analysis_history`

**Dependências**:
- `LOVABLE_API_KEY`
- Tabela `bioimpedance`
- Tabela `ai_analysis_history`

---

### 4. create-user-account (Admin)

**Arquivo**: `supabase/functions/create-user-account/index.ts`

**Propósito**: Cria conta de usuário para paciente

**Entrada**:
```json
{
  "email": "paciente@email.com",
  "password": "senha123",
  "patientId": "uuid-do-paciente",
  "role": "viewer" | "admin"
}
```

**Segurança**: Apenas admins podem executar

**Fluxo**:
1. Verifica se chamador é admin
2. Cria usuário via `supabase.auth.admin.createUser`
3. Vincula usuário ao paciente (`patients.user_id`)
4. Cria role em `user_roles`

**Dependências**:
- `SUPABASE_SERVICE_ROLE_KEY`
- Tabela `patients`
- Tabela `user_roles`

---

### 5. update-user-password (Admin)

**Arquivo**: `supabase/functions/update-user-password/index.ts`

**Propósito**: Atualiza senha de usuário

**Entrada**:
```json
{
  "userId": "uuid-do-usuario",
  "newPassword": "nova-senha"
}
```

**Segurança**: Apenas admins podem executar

---

### 6. update-user-role (Admin)

**Arquivo**: `supabase/functions/update-user-role/index.ts`

**Propósito**: Altera role de usuário (admin ↔ viewer)

**Entrada**:
```json
{
  "userId": "uuid-do-usuario",
  "newRole": "admin" | "viewer"
}
```

---

### 7. manage-api-keys (Gerenciamento)

**Arquivo**: `supabase/functions/manage-api-keys/index.ts`

**Propósito**: CRUD de chaves de API com criptografia

**Ações**:
- `list`: Lista chaves (mascaradas)
- `create`: Cria nova chave (criptografada)
- `update`: Atualiza chave
- `rotate`: Rotaciona chave (salva histórico)
- `history`: Busca histórico de rotações
- `delete`: Remove chave

**Criptografia**: XOR com primeiros 32 chars do `SUPABASE_SERVICE_ROLE_KEY`

---

### 8. analyze-comparison

**Arquivo**: `supabase/functions/analyze-comparison/index.ts`

**Propósito**: Compara dados de dois pacientes

---

## 🗄️ BANCO DE DADOS

### Tabelas Principais

#### patients
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  height NUMERIC,
  address TEXT,
  medical_notes TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  user_id UUID, -- Link para auth.users
  created_by UUID,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### bioimpedance
```sql
CREATE TABLE bioimpedance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  user_person user_person NOT NULL, -- enum: 'reneer' | 'ana_paula'
  measurement_date DATE NOT NULL,
  week_number INTEGER,
  monjaro_dose NUMERIC,
  status TEXT,
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### ai_analysis_history
```sql
CREATE TABLE ai_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  user_person TEXT NOT NULL,
  analysis_date TIMESTAMPTZ DEFAULT now(),
  summary TEXT NOT NULL,
  full_analysis TEXT NOT NULL,
  weight_at_analysis NUMERIC,
  bmi_at_analysis NUMERIC,
  fat_at_analysis NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### patient_scores (Gamificação)
```sql
CREATE TABLE patient_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES patients(id),
  score NUMERIC DEFAULT 0,
  weight_evolution NUMERIC DEFAULT 0,
  fat_evolution NUMERIC DEFAULT 0,
  muscle_evolution NUMERIC DEFAULT 0,
  criticality TEXT DEFAULT 'normal',
  rank_position INTEGER,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role DEFAULT 'viewer', -- enum: 'admin' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### api_configurations
```sql
CREATE TABLE api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  config_value TEXT,
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### api_key_history
```sql
CREATE TABLE api_key_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES api_configurations(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  provider TEXT,
  rotated_at TIMESTAMPTZ DEFAULT now(),
  rotated_by UUID REFERENCES auth.users(id),
  rotation_reason TEXT,
  version_number INTEGER DEFAULT 1
);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  user_person TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_name TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  change_value NUMERIC,
  is_positive BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Enums

```sql
CREATE TYPE user_person AS ENUM ('reneer', 'ana_paula');
CREATE TYPE app_role AS ENUM ('admin', 'viewer');
```

### Funções do Banco

#### is_master(uuid)
```sql
CREATE OR REPLACE FUNCTION is_master(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### has_role(uuid, app_role)
```sql
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### calculate_patient_score(uuid)
Calcula score do paciente baseado na evolução de métricas.

#### update_leaderboard_rankings()
Atualiza posições do ranking.

#### check_bioimpedance_changes()
Trigger que gera notificações automáticas quando métricas mudam significativamente.

---

## 🔒 SEGURANÇA (RLS)

### Padrão de Políticas

```sql
-- Pacientes só veem seus próprios dados
CREATE POLICY "Users can view own data" ON bioimpedance
FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = bioimpedance.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Admins veem tudo
CREATE POLICY "Admins can view all" ON bioimpedance
FOR SELECT USING (is_master(auth.uid()));
```

---

## 🔗 APIs E INTEGRAÇÕES

### Lovable AI Gateway

**URL**: `https://ai.gateway.lovable.dev/v1/chat/completions`

**Autenticação**: `Authorization: Bearer ${LOVABLE_API_KEY}`

**Modelos Usados**:
- `google/gemini-2.5-pro` - Análises detalhadas, OCR complexo
- `google/gemini-2.5-flash` - Insights rápidos
- `google/gemini-2.5-flash-lite` - Resumos curtos

### Supabase Secrets Necessários

| Secret | Descrição | Auto-gerado |
|--------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto | ✅ |
| `SUPABASE_ANON_KEY` | Chave pública | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin | ✅ |
| `LOVABLE_API_KEY` | Lovable AI Gateway | ✅ |

---

## 🚀 COMO RECRIAR O PROJETO

### 1. Criar Novo Projeto no Lovable
- Ativar Lovable Cloud

### 2. Executar Migrations
- Usar arquivo `EXPORT_DATABASE_COMPLETE.sql`

### 3. Criar Edge Functions
- Copiar pasta `supabase/functions/` inteira
- Atualizar `supabase/config.toml`

### 4. Configurar Auth
- Habilitar auto-confirm email
- Criar usuário admin inicial

### 5. Dados Iniciais (Opcional)
- Usar arquivo `EXPORT_DATA.sql` para dados de teste

---

## 📊 MÉTRICAS E LIMITES

### Lovable AI Gateway
- ~1000-2000 requests/mês inclusos
- Rate limit por workspace
- Erros: 429 (rate limit), 402 (créditos)

### Supabase (Free Tier)
- 500 MB banco de dados
- 1 GB storage
- 2 GB bandwidth/mês
