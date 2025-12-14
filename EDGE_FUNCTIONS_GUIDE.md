# GUIA RÁPIDO - EDGE FUNCTIONS ZOEMED_BIO

## 📁 ESTRUTURA DE ARQUIVOS

```
supabase/
├── config.toml
└── functions/
    ├── analyze-comparison/
    │   └── index.ts
    ├── create-user-account/
    │   └── index.ts
    ├── generate-analysis/
    │   └── index.ts
    ├── manage-api-keys/
    │   └── index.ts
    ├── process-bioimpedance/
    │   └── index.ts
    ├── process-bioimpedance-v2/
    │   └── index.ts
    ├── update-user-password/
    │   └── index.ts
    └── update-user-role/
        └── index.ts
```

## ⚙️ CONFIG.TOML

```toml
project_id = "SEU_PROJECT_ID"

[functions.analyze-comparison]
verify_jwt = true

[functions.create-user-account]
verify_jwt = true

[functions.generate-analysis]
verify_jwt = true

[functions.manage-api-keys]
verify_jwt = false

[functions.process-bioimpedance]
verify_jwt = true

[functions.process-bioimpedance-v2]
verify_jwt = true

[functions.update-user-password]
verify_jwt = true

[functions.update-user-role]
verify_jwt = true
```

## 🔑 SECRETS NECESSÁRIOS

| Secret | Descrição | Origem |
|--------|-----------|--------|
| `SUPABASE_URL` | URL do projeto Supabase | Automático |
| `SUPABASE_ANON_KEY` | Chave pública | Automático |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin (para criar usuários) | Automático |
| `LOVABLE_API_KEY` | Gateway de IA Lovable | Automático (Lovable Cloud) |

## 📊 RESUMO DAS FUNÇÕES

| Função | JWT | Propósito | API Externa |
|--------|-----|-----------|-------------|
| `process-bioimpedance-v2` | ✅ | OCR de imagens | Lovable AI |
| `process-bioimpedance` | ✅ | OCR (legacy) | Lovable AI |
| `generate-analysis` | ✅ | Análise completa IA | Lovable AI |
| `analyze-comparison` | ✅ | Comparar pacientes | Lovable AI |
| `create-user-account` | ✅ | Criar usuário | - |
| `update-user-password` | ✅ | Alterar senha | - |
| `update-user-role` | ✅ | Alterar role | - |
| `manage-api-keys` | ❌ | CRUD de chaves | - |

## 🚀 COMO CHAMAR

### Via Supabase SDK (Recomendado)
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("generate-analysis", {
  body: { patientId: "uuid", userPerson: "reneer" }
});
```

### Via Fetch (com token)
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-analysis`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ patientId: "uuid" }),
  }
);
```

## 🔒 PADRÃO DE AUTENTICAÇÃO

Todas as funções (exceto `manage-api-keys`) seguem este padrão:

```typescript
// 1. Verificar header de autorização
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(JSON.stringify({ error: "Missing authorization" }), {
    status: 401,
    headers: corsHeaders,
  });
}

// 2. Verificar usuário
const supabase = createClient(url, key, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user }, error } = await supabase.auth.getUser();

// 3. (Opcional) Verificar role de admin
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .single();

if (roleData?.role !== "admin") {
  throw new Error("Only admins can perform this action");
}
```

## 🤖 PADRÃO DE CHAMADA À IA

```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash", // ou gemini-2.5-pro
    messages: [
      { role: "system", content: "Prompt do sistema..." },
      { role: "user", content: "Pergunta do usuário..." }
    ],
  }),
});

// Tratamento de erros
if (!response.ok) {
  if (response.status === 429) {
    // Rate limit - esperar e tentar novamente
  }
  if (response.status === 402) {
    // Sem créditos - notificar usuário
  }
}

const result = await response.json();
const content = result.choices?.[0]?.message?.content;
```

## 📝 CORS HEADERS

Todas as funções devem incluir:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tratar preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

// Incluir em todas as respostas
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```
