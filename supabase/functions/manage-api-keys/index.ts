import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using base64 + XOR with secret key
const ENCRYPTION_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32) || "default_encryption_key_32chars!";

function encrypt(text: string): string {
  if (!text) return "";
  const encoded = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
  const encrypted = new Uint8Array(encoded.length);
  
  for (let i = 0; i < encoded.length; i++) {
    encrypted[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const decoded = atob(encryptedText);
    const encrypted = new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch {
    return encryptedText;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        const { data: configs, error } = await supabase
          .from("api_configurations")
          .select("*")
          .or("provider.eq.ocr,provider.eq.ai,provider.eq.lovable,provider.eq.google,provider.eq.openai,provider.eq.anthropic,provider.eq.custom")
          .order("config_key");

        if (error) throw error;

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
        const { config_key, config_value, provider } = data;
        
        if (!config_key || !provider) {
          return new Response(
            JSON.stringify({ error: "config_key and provider are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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

        const updateData: Record<string, unknown> = {};
        
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

      case "rotate": {
        const { id, new_value, reason } = data;
        
        if (!id || !new_value) {
          return new Response(
            JSON.stringify({ error: "id and new_value are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current config
        const { data: currentConfig, error: fetchError } = await supabase
          .from("api_configurations")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        // Get current version number
        const { data: lastHistory } = await supabase
          .from("api_key_history")
          .select("version_number")
          .eq("config_id", id)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();

        const newVersionNumber = (lastHistory?.version_number || 0) + 1;

        // Save current value to history
        if (currentConfig.config_value) {
          const { error: historyError } = await supabase
            .from("api_key_history")
            .insert({
              config_id: id,
              config_key: currentConfig.config_key,
              encrypted_value: currentConfig.config_value,
              provider: currentConfig.provider,
              rotated_by: user.id,
              rotation_reason: reason || "Rotação manual",
              version_number: newVersionNumber
            });

          if (historyError) {
            console.error("History insert error:", historyError);
            throw historyError;
          }
        }

        // Update with new encrypted value
        const encryptedNewValue = encrypt(new_value);
        const { data: updated, error: updateError } = await supabase
          .from("api_configurations")
          .update({
            config_value: encryptedNewValue,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log(`API key rotated: ${currentConfig.config_key}, version: ${newVersionNumber}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              ...updated, 
              config_value: maskApiKey(new_value),
              has_value: true
            },
            version: newVersionNumber
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "history": {
        const { config_id } = data;
        
        if (!config_id) {
          return new Response(
            JSON.stringify({ error: "config_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: history, error } = await supabase
          .from("api_key_history")
          .select("*")
          .eq("config_id", config_id)
          .order("version_number", { ascending: false });

        if (error) throw error;

        const maskedHistory = history?.map(h => ({
          ...h,
          encrypted_value: maskApiKey(decrypt(h.encrypted_value))
        }));

        return new Response(
          JSON.stringify({ success: true, data: maskedHistory }),
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