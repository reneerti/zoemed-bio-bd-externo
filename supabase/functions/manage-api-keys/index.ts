import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using base64 + XOR with secret key
// In production, consider using Deno's crypto.subtle for AES encryption
const ENCRYPTION_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32) || "default_encryption_key_32chars!";

function encrypt(text: string): string {
  if (!text) return "";
  const encoded = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
  const encrypted = new Uint8Array(encoded.length);
  
  for (let i = 0; i < encoded.length; i++) {
    encrypted[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Convert to base64 for safe storage
  return btoa(String.fromCharCode(...encrypted));
}

function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    // Decode from base64
    const decoded = atob(encryptedText);
    const encrypted = new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch {
    return encryptedText; // Return as-is if decryption fails (might be unencrypted)
  }
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is master/admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage API keys" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, data } = await req.json();

    switch (action) {
      case "list": {
        // Get all API key configurations
        const { data: configs, error } = await supabase
          .from("api_configurations")
          .select("*")
          .or("provider.eq.ocr,provider.eq.ai,provider.eq.lovable,provider.eq.google,provider.eq.openai,provider.eq.anthropic,provider.eq.custom")
          .order("config_key");

        if (error) throw error;

        // Mask the values for security (don't send full keys to frontend)
        const maskedConfigs = configs?.map(c => ({
          ...c,
          config_value: c.config_value ? maskApiKey(decrypt(c.config_value)) : null,
          has_value: !!c.config_value
        }));

        return new Response(
          JSON.stringify({ success: true, data: maskedConfigs }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        const { config_key, config_value, provider, display_name } = data;
        
        if (!config_key || !provider) {
          return new Response(
            JSON.stringify({ error: "config_key and provider are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Encrypt the API key value
        const encryptedValue = config_value ? encrypt(config_value) : null;

        const { data: newConfig, error } = await supabase
          .from("api_configurations")
          .insert({
            config_key,
            config_value: encryptedValue,
            provider,
            is_active: true,
            priority: 1
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              ...newConfig, 
              config_value: config_value ? maskApiKey(config_value) : null,
              has_value: !!config_value
            } 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { id, config_value, is_active, priority } = data;
        
        if (!id) {
          return new Response(
            JSON.stringify({ error: "id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: any = {};
        
        if (config_value !== undefined) {
          updateData.config_value = config_value ? encrypt(config_value) : null;
        }
        if (is_active !== undefined) {
          updateData.is_active = is_active;
        }
        if (priority !== undefined) {
          updateData.priority = priority;
        }
        updateData.updated_at = new Date().toISOString();

        const { data: updatedConfig, error } = await supabase
          .from("api_configurations")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              ...updatedConfig, 
              config_value: updatedConfig.config_value ? maskApiKey(decrypt(updatedConfig.config_value)) : null,
              has_value: !!updatedConfig.config_value
            } 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { id } = data;
        
        if (!id) {
          return new Response(
            JSON.stringify({ error: "id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("api_configurations")
          .delete()
          .eq("id", id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_decrypted": {
        // This action is only for internal use by other edge functions
        // Returns decrypted value for a specific key
        const { config_key } = data;
        
        const { data: config, error } = await supabase
          .from("api_configurations")
          .select("config_value")
          .eq("config_key", config_key)
          .eq("is_active", true)
          .single();

        if (error || !config?.config_value) {
          return new Response(
            JSON.stringify({ success: false, value: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, value: decrypt(config.config_value) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in manage-api-keys:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
