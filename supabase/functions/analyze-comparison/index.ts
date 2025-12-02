import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authenticated user:", user.id);

    const { reneerData, anaPaulaData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analise os dados de bioimpedância de dois pacientes em protocolo Monjaro e forneça insights personalizados em português.

DADOS DO RENEER:
- Peso: ${reneerData.weight} kg (inicial: ${reneerData.initialWeight} kg, variação: ${reneerData.weightChange} kg)
- Gordura corporal: ${reneerData.fat}%
- Taxa muscular: ${reneerData.muscle}%
- Gordura visceral: ${reneerData.visceralFat}
- IMC: ${reneerData.bmi}
- TMB: ${reneerData.bmr} kcal
- Total de medições: ${reneerData.measurements}

DADOS DA ANA PAULA:
- Peso: ${anaPaulaData.weight} kg (inicial: ${anaPaulaData.initialWeight} kg, variação: ${anaPaulaData.weightChange} kg)
- Gordura corporal: ${anaPaulaData.fat}%
- Taxa muscular: ${anaPaulaData.muscle}%
- Gordura visceral: ${anaPaulaData.visceralFat}
- IMC: ${anaPaulaData.bmi}
- TMB: ${anaPaulaData.bmr} kcal
- Total de medições: ${anaPaulaData.measurements}

Forneça uma análise comparativa estruturada com:
1. **Resumo Geral** (2-3 frases sobre o progresso de ambos)
2. **Destaque Reneer** (ponto forte e área de melhoria)
3. **Destaque Ana Paula** (ponto forte e área de melhoria)
4. **Insight Comparativo** (o que a comparação revela sobre os diferentes perfis)
5. **Recomendação Conjunta** (algo que ambos podem fazer para melhorar)

Seja conciso, use emojis para destacar pontos importantes, e foque em insights acionáveis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista e personal trainer especializado em análise de bioimpedância e protocolos de emagrecimento com tirzepatida (Monjaro). Forneça análises precisas, motivadoras e baseadas em evidências.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const insights = aiResult.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ insights }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-comparison function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
