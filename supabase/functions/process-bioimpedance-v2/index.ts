import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Regex patterns for bioimpedance data extraction
const BIOIMPEDANCE_PATTERNS: Record<string, RegExp[]> = {
  weight: [
    /peso[:\s]*(\d+[.,]\d+)\s*kg/i,
    /weight[:\s]*(\d+[.,]\d+)\s*kg/i,
    /(\d+[.,]\d+)\s*kg\s*peso/i,
  ],
  bmi: [
    /imc[:\s]*(\d+[.,]\d+)/i,
    /bmi[:\s]*(\d+[.,]\d+)/i,
    /índice.*massa.*corporal[:\s]*(\d+[.,]\d+)/i,
  ],
  body_fat_percent: [
    /gordura\s*corporal[:\s]*(\d+[.,]\d+)\s*%/i,
    /body\s*fat[:\s]*(\d+[.,]\d+)\s*%/i,
    /bf[:\s]*(\d+[.,]\d+)\s*%/i,
    /taxa.*gordura[:\s]*(\d+[.,]\d+)/i,
  ],
  muscle_mass: [
    /massa\s*muscular[:\s]*(\d+[.,]\d+)\s*kg/i,
    /muscle\s*mass[:\s]*(\d+[.,]\d+)/i,
    /músculo[:\s]*(\d+[.,]\d+)\s*kg/i,
  ],
  muscle_rate_percent: [
    /taxa\s*muscular[:\s]*(\d+[.,]\d+)\s*%/i,
    /muscle\s*rate[:\s]*(\d+[.,]\d+)/i,
    /músculos[:\s]*(\d+[.,]\d+)\s*%/i,
  ],
  visceral_fat: [
    /gordura\s*visceral[:\s]*(\d+)/i,
    /visceral\s*fat[:\s]*(\d+)/i,
    /gv[:\s]*(\d+)/i,
  ],
  bone_mass: [
    /massa\s*óssea[:\s]*(\d+[.,]\d+)/i,
    /bone\s*mass[:\s]*(\d+[.,]\d+)/i,
    /ossos[:\s]*(\d+[.,]\d+)/i,
  ],
  body_water_percent: [
    /água\s*corporal[:\s]*(\d+[.,]\d+)\s*%/i,
    /body\s*water[:\s]*(\d+[.,]\d+)/i,
    /hidratação[:\s]*(\d+[.,]\d+)/i,
  ],
  bmr: [
    /tmb[:\s]*(\d+)\s*kcal/i,
    /bmr[:\s]*(\d+)/i,
    /metabolismo\s*basal[:\s]*(\d+)/i,
  ],
  metabolic_age: [
    /idade\s*metabólica[:\s]*(\d+)/i,
    /metabolic\s*age[:\s]*(\d+)/i,
  ],
  protein_percent: [
    /proteína[:\s]*(\d+[.,]\d+)\s*%/i,
    /protein[:\s]*(\d+[.,]\d+)/i,
  ],
  subcutaneous_fat_percent: [
    /gordura\s*subcutânea[:\s]*(\d+[.,]\d+)/i,
    /subcutaneous[:\s]*(\d+[.,]\d+)/i,
  ],
  skeletal_muscle_percent: [
    /músculo\s*esquelético[:\s]*(\d+[.,]\d+)/i,
    /skeletal\s*muscle[:\s]*(\d+[.,]\d+)/i,
  ],
};

// Parse extracted text using regex
function parseWithRegex(text: string): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  
  for (const [field, patterns] of Object.entries(BIOIMPEDANCE_PATTERNS)) {
    result[field] = null;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(",", "."));
        if (!isNaN(value)) {
          result[field] = value;
          break;
        }
      }
    }
  }
  
  return result;
}

// Calculate additional fields
function calculateDerivedFields(data: Record<string, number | null>): Record<string, number | null> {
  const result = { ...data };
  
  // Calculate fat mass if we have weight and body fat percent
  if (data.weight && data.body_fat_percent && !data.fat_mass) {
    result.fat_mass = data.weight * (data.body_fat_percent / 100);
  }
  
  // Calculate lean mass
  if (data.weight && result.fat_mass && !data.lean_mass) {
    result.lean_mass = data.weight - result.fat_mass;
  }
  
  return result;
}

// Log API usage
async function logApiUsage(
  supabase: any,
  provider: string,
  operationType: string,
  patientId: string | null,
  success: boolean,
  durationMs: number,
  tokensUsed: number = 0,
  estimatedCost: number = 0,
  errorMessage: string | null = null
) {
  try {
    await supabase.from("api_usage_logs").insert({
      provider,
      operation_type: operationType,
      patient_id: patientId,
      success,
      request_duration_ms: durationMs,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error("Failed to log API usage:", e);
  }
}

// Get API configuration
async function getApiConfig(supabase: any, configKey: string): Promise<string | null> {
  const { data } = await supabase
    .from("api_configurations")
    .select("config_value, is_active")
    .eq("config_key", configKey)
    .eq("is_active", true)
    .single();
  
  return data?.config_value || null;
}

// Get active OCR providers in order of priority
async function getOcrProviders(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from("api_configurations")
    .select("config_value")
    .like("config_key", "ocr_%")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  
  return (data || []).map((d: any) => d.config_value).filter(Boolean);
}

// Get active AI models in order of priority
async function getAiModels(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from("api_configurations")
    .select("config_value")
    .like("config_key", "ai_%")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  
  return (data || []).map((d: any) => d.config_value).filter(Boolean);
}

// OCR using Lovable Gateway (Gemini Vision)
async function ocrWithLovableGateway(imageUrl: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this bioimpedance report image. Return the complete raw text exactly as shown, preserving all numbers, units, and labels. Do not interpret or summarize - just extract the text."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate insights using AI
async function generateInsightsWithAI(
  supabase: any,
  parsedData: Record<string, number | null>,
  patientId: string,
  model: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // Get patient history for context
  const { data: history } = await supabase
    .from("bioimpedance")
    .select("*")
    .eq("patient_id", patientId)
    .order("measurement_date", { ascending: false })
    .limit(5);

  const prompt = `Analise os seguintes dados de bioimpedância e forneça insights personalizados em português:

Dados atuais:
${JSON.stringify(parsedData, null, 2)}

Histórico recente:
${JSON.stringify(history || [], null, 2)}

Forneça:
1. Análise geral do estado atual
2. Comparação com medições anteriores (se houver)
3. Pontos de atenção
4. Recomendações práticas

Seja conciso e direto.`;

  const modelMap: Record<string, string> = {
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
  };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelMap[model] || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um especialista em análise de bioimpedância e saúde." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate template-based insights (free, no AI)
function generateTemplateInsights(parsedData: Record<string, number | null>): string {
  const insights: string[] = [];

  // BMI analysis
  if (parsedData.bmi) {
    if (parsedData.bmi < 18.5) {
      insights.push("⚠️ IMC abaixo do ideal. Considere aumentar a ingestão calórica.");
    } else if (parsedData.bmi < 25) {
      insights.push("✅ IMC dentro da faixa saudável.");
    } else if (parsedData.bmi < 30) {
      insights.push("⚠️ IMC indica sobrepeso. Recomenda-se atenção à dieta e exercícios.");
    } else {
      insights.push("🔴 IMC indica obesidade. Consulte um profissional de saúde.");
    }
  }

  // Body fat analysis
  if (parsedData.body_fat_percent) {
    if (parsedData.body_fat_percent < 15) {
      insights.push("💪 Gordura corporal baixa - perfil atlético.");
    } else if (parsedData.body_fat_percent < 25) {
      insights.push("✅ Gordura corporal em nível saudável.");
    } else if (parsedData.body_fat_percent < 35) {
      insights.push("⚠️ Gordura corporal elevada. Considere ajustes na dieta.");
    } else {
      insights.push("🔴 Gordura corporal muito alta. Recomenda-se acompanhamento profissional.");
    }
  }

  // Visceral fat
  if (parsedData.visceral_fat) {
    if (parsedData.visceral_fat <= 9) {
      insights.push("✅ Gordura visceral em nível saudável.");
    } else if (parsedData.visceral_fat <= 14) {
      insights.push("⚠️ Gordura visceral elevada. Atenção à saúde cardiovascular.");
    } else {
      insights.push("🔴 Gordura visceral muito alta. Risco aumentado para doenças.");
    }
  }

  // Muscle rate
  if (parsedData.muscle_rate_percent) {
    if (parsedData.muscle_rate_percent >= 40) {
      insights.push("💪 Excelente massa muscular.");
    } else if (parsedData.muscle_rate_percent >= 30) {
      insights.push("✅ Massa muscular adequada.");
    } else {
      insights.push("⚠️ Massa muscular baixa. Considere exercícios de resistência.");
    }
  }

  if (insights.length === 0) {
    insights.push("📊 Dados registrados com sucesso. Continue acompanhando sua evolução.");
  }

  return insights.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { imageUrl, patientId, skipAi = false } = await req.json();

    if (!imageUrl || !patientId) {
      return new Response(JSON.stringify({ error: "imageUrl and patientId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get OCR providers
    const ocrProviders = await getOcrProviders(supabase);
    console.log("OCR providers:", ocrProviders);

    let rawText = "";
    let extractionMethod = "";
    let ocrSuccess = false;

    // Step 2: Try OCR with fallback
    for (const provider of ocrProviders) {
      const ocrStartTime = Date.now();
      try {
        if (provider === "lovable_gateway") {
          rawText = await ocrWithLovableGateway(imageUrl);
          extractionMethod = "lovable_gateway";
        } else if (provider === "regex_only") {
          // Skip OCR, will try regex on any existing text
          extractionMethod = "regex_only";
          break;
        }
        // Add more providers here (google_vision, etc.)

        if (rawText) {
          ocrSuccess = true;
          await logApiUsage(supabase, provider, "ocr", patientId, true, Date.now() - ocrStartTime);
          break;
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`OCR failed with ${provider}:`, error);
        await logApiUsage(supabase, provider, "ocr", patientId, false, Date.now() - ocrStartTime, 0, 0, errorMsg);
      }
    }

    // Step 3: Parse with regex (always free)
    console.log("Parsing with regex...");
    let parsedData = parseWithRegex(rawText);
    parsedData = calculateDerivedFields(parsedData);
    
    const hasData = Object.values(parsedData).some(v => v !== null);
    console.log("Parsed data:", parsedData, "Has data:", hasData);

    // Step 4: Store raw extraction
    const { data: extraction, error: extractionError } = await supabase
      .from("raw_ocr_extractions")
      .insert({
        patient_id: patientId,
        image_url: imageUrl,
        raw_text: rawText,
        extraction_method: extractionMethod,
        extraction_status: hasData ? "success" : (ocrSuccess ? "parsed_failed" : "ocr_failed"),
        parsed_data: parsedData,
        ai_processed: false,
      })
      .select()
      .single();

    if (extractionError) {
      console.error("Failed to store extraction:", extractionError);
    }

    // Step 5: Generate insights
    let insights = "";
    const aiModels = await getAiModels(supabase);
    
    if (!skipAi && hasData && aiModels.length > 0 && aiModels[0] !== "template_only") {
      // Try AI with fallback
      for (const model of aiModels) {
        if (model === "template_only") {
          insights = generateTemplateInsights(parsedData);
          break;
        }
        
        const aiStartTime = Date.now();
        try {
          insights = await generateInsightsWithAI(supabase, parsedData, patientId, model);
          await logApiUsage(supabase, model, "ai_analysis", patientId, true, Date.now() - aiStartTime);
          
          // Update extraction as AI processed
          if (extraction) {
            await supabase
              .from("raw_ocr_extractions")
              .update({ ai_processed: true })
              .eq("id", extraction.id);
          }
          break;
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`AI analysis failed with ${model}:`, error);
          await logApiUsage(supabase, model, "ai_analysis", patientId, false, Date.now() - aiStartTime, 0, 0, errorMsg);
        }
      }
    }

    // Fallback to template if AI failed
    if (!insights && hasData) {
      insights = generateTemplateInsights(parsedData);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`Processing completed in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedData: parsedData,
        rawText: rawText.substring(0, 500), // Truncate for response
        insights,
        extractionId: extraction?.id,
        processingTime: totalDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in process-bioimpedance-v2:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        processingTime: Date.now() - startTime 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
