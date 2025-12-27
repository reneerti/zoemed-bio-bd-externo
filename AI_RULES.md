# Regras de Desenvolvimento e Stack Tecnológica (ZOEMED_BIO)

Este documento define a stack tecnológica principal e as regras de uso de bibliotecas para garantir consistência, manutenibilidade e performance do projeto.

## 🛠️ Stack Tecnológica Principal

1. **Frontend Framework:** React 18 + TypeScript (via Vite).
2. **Estilização:** Tailwind CSS 3.x (abordagem utility-first).
3. **Componentes UI:** Shadcn/UI (baseado em Radix UI) para componentes acessíveis e estilizados.
4. **Backend & Database:** Supabase (PostgreSQL) para banco de dados, autenticação e armazenamento (Storage).
5. **Lógica de Backend/IA:** Supabase Edge Functions (Deno) para lógica de negócios e integração com IA.
6. **Gateway de IA:** Lovable AI Gateway (utilizando modelos Google Gemini) para OCR e análises complexas.
7. **Gerenciamento de Estado (Server):** `@tanstack/react-query` para caching e sincronização de dados.
8. **Roteamento:** `react-router-dom` para navegação no lado do cliente.
9. **Gráficos:** `recharts` para todas as visualizações de dados (evolução, radar, etc.).
10. **Notificações:** `sonner` para toasts e notificações de usuário.

## 📚 Regras de Uso de Bibliotecas

| Propósito | Biblioteca Obrigatória | Regras de Uso |
| :--- | :--- | :--- |
| **Componentes UI** | `shadcn/ui` | **Prioridade máxima.** Use os componentes Shadcn/UI (Button, Card, Dialog, Input, etc.) sempre que possível. Evite criar componentes básicos do zero. |
| **Estilização** | `tailwindcss` | **Exclusivo.** Use classes utilitárias do Tailwind para todo o design e layout. Mantenha a responsividade em mente (`md:`, `lg:`, etc.). |
| **Ícones** | `lucide-react` | Use apenas ícones do pacote Lucide. |
| **Gráficos** | `recharts` | Use para todas as visualizações de dados (LineChart, BarChart, RadarChart). |
| **Gerenciamento de Dados** | `@tanstack/react-query` | Use para gerenciar o estado do servidor (fetch, cache, mutações). Não use para estado local simples. |
| **Autenticação/DB** | `@supabase/supabase-js` | Use o cliente `supabase` (importado de `@/integrations/supabase/client`) para todas as interações com Auth, Database e Storage. |
| **Edge Functions** | `supabase.functions.invoke` | Use este método para chamar qualquer lógica de backend que envolva IA, OCR ou lógica administrativa sensível (ex: `generate-analysis`, `process-bioimpedance-v2`). |
| **Notificações** | `sonner` | Use `toast.success()`, `toast.error()`, etc., para feedback ao usuário. |
| **Manipulação de Datas** | `date-fns` | Use para formatação e manipulação de datas (ex: `format`, `formatDistanceToNow`). |
| **Geração de PDF** | `jspdf` e `html2canvas` | Use `jspdf` para gerar relatórios estáticos. |

## ⚠️ Diretrizes de Código

* **Tipagem:** Todos os componentes e funções devem ser tipados usando TypeScript.
* **Estrutura:** Mantenha a estrutura de pastas (`src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`).
* **Simplicidade:** Priorize soluções simples e elegantes. Evite over-engineering.