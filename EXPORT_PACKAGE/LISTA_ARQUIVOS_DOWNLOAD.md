# 📋 LISTA COMPLETA DE ARQUIVOS PARA DOWNLOAD

## Como Baixar do Lovable
1. Acesse seu projeto no Lovable
2. Clique no ícone de menu (três barras) no canto superior direito
3. Selecione "Export to GitHub" ou use o botão de download

---

## ✅ ARQUIVOS ESSENCIAIS (OBRIGATÓRIOS)

### 1. Database (Banco de Dados)
```
/SETUP_DATABASE.sql              ← EXECUTE ESTE NO NOVO PROJETO
/EXPORT_DATABASE_COMPLETE.sql    ← Backup completo do schema
```

### 2. Edge Functions (Backend)
```
/supabase/config.toml
/supabase/functions/generate-analysis/index.ts
/supabase/functions/process-bioimpedance/index.ts
/supabase/functions/process-bioimpedance-v2/index.ts
/supabase/functions/manage-api-keys/index.ts
/supabase/functions/create-user-account/index.ts
/supabase/functions/update-user-password/index.ts
/supabase/functions/update-user-role/index.ts
/supabase/functions/analyze-comparison/index.ts
```

### 3. Design System
```
/src/index.css                   ← Cores, fontes, animações
/tailwind.config.ts              ← Configuração Tailwind
```

### 4. Bibliotecas/Utilitários
```
/src/lib/referenceValues.ts      ← Valores de referência médicos
/src/lib/utils.ts                ← Utilitários gerais
/src/lib/buildInfo.ts            ← Informações de build
```

### 5. Assets (Imagens)
```
/src/assets/logo.png
/src/assets/zoemedbio-splash-logo.png
/src/assets/reneer-avatar.png
/src/assets/ana-paula-avatar.png
/public/pwa-192x192.png
/public/pwa-512x512.png
/public/favicon.png
```

---

## 📁 ARQUIVOS POR PASTA

### /src/components/ (Componentes React)
```
AnaPaulaProtocol.tsx
AnalysisHistory.tsx
BioimpedanceTable.tsx
ComparativeCharts.tsx
GoalsProgress.tsx
LeaderboardTop3.tsx
MetricsRadarChart.tsx
MonjaroTracking.tsx
NavLink.tsx
NotificationCenter.tsx
PatientScoreCard.tsx
ProtectedRoute.tsx
ProteinCalculator.tsx
ReneerProtocol.tsx
ReportGenerator.tsx
SplashScreen.tsx
SupplementationCard.tsx
UpdateNotification.tsx
```

### /src/components/master/ (Componentes Admin)
```
ApiConfiguration.tsx
CustomFieldsConfig.tsx
GamificationDashboard.tsx
MasterReports.tsx
PatientManagement.tsx
PdfReportGenerator.tsx
```

### /src/components/ui/ (UI Components - Shadcn)
```
Todos os arquivos .tsx (accordion, button, card, dialog, etc.)
```

### /src/pages/ (Páginas)
```
AddMeasurement.tsx
AddPatientMeasurement.tsx
Dashboard.tsx
Index.tsx
Install.tsx
Login.tsx
MasterDashboard.tsx
NotFound.tsx
PatientDashboard.tsx
PatientDetails.tsx
SelectUser.tsx
Signup.tsx
Upload.tsx
```

### /src/hooks/ (Hooks)
```
use-mobile.tsx
use-toast.ts
useAuth.tsx
usePatientId.tsx
useServiceWorkerUpdate.tsx
useUserRole.tsx
```

---

## 📚 DOCUMENTAÇÃO
```
/DOCUMENTACAO_TECNICA.md         ← Documentação técnica completa
/EDGE_FUNCTIONS_GUIDE.md         ← Guia das Edge Functions
/SETUP_AUTOMATIZADO.md           ← Guia de setup passo-a-passo
/EXPORT_PACKAGE/README.md        ← Instruções do pacote
```

---

## ⚙️ CONFIGURAÇÃO (Não editar manualmente)
```
/package.json                    ← Dependências
/vite.config.ts                  ← Configuração Vite
/tsconfig.json                   ← Configuração TypeScript
/index.html                      ← HTML principal
```

---

## 🚀 ORDEM DE EXECUÇÃO NO NOVO PROJETO

### Fase 1: Banco de Dados
1. Habilitar Lovable Cloud
2. Executar `/SETUP_DATABASE.sql` como migration

### Fase 2: Edge Functions
1. Criar pasta `/supabase/functions/`
2. Copiar cada função com seu `index.ts`
3. Atualizar `/supabase/config.toml`

### Fase 3: Frontend
1. Copiar `/src/` completo
2. Copiar `/public/` completo
3. Copiar arquivos de config da raiz

### Fase 4: Configuração Final
1. Criar primeiro usuário (signup)
2. Promover a admin via SQL
3. Testar todas as funcionalidades

---

## 📊 ESTIMATIVA DE TAMANHO

| Categoria | Arquivos | Tamanho Aprox. |
|-----------|----------|----------------|
| Edge Functions | 8 | ~50 KB |
| Componentes | ~50 | ~300 KB |
| Páginas | 12 | ~100 KB |
| UI Components | ~40 | ~150 KB |
| Database SQL | 2 | ~50 KB |
| Documentação | 4 | ~40 KB |
| Assets | 6 | ~500 KB |
| **TOTAL** | **~120** | **~1.2 MB** |

---

## ⚡ DOWNLOAD RÁPIDO VIA GITHUB

A maneira mais fácil de obter todos os arquivos:

1. No Lovable, vá em Settings → GitHub
2. Conecte/crie um repositório
3. Faça sync do projeto
4. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/zoemed-bio.git
   ```
5. Todos os arquivos estarão disponíveis localmente

---

## 🔐 IMPORTANTE: Variáveis de Ambiente

As seguintes variáveis são configuradas **automaticamente** pelo Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions)
- `LOVABLE_API_KEY` (IA Gateway)

**NÃO copie o arquivo .env** - ele será regenerado automaticamente.
