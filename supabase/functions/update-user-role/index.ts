import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Only admins can change user roles");
    }

    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      throw new Error("userId and newRole are required");
    }

    // Validate role
    if (newRole !== "admin" && newRole !== "viewer") {
      throw new Error("Invalid role. Must be 'admin' or 'viewer'");
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !existingUser?.user) {
      throw new Error("User not found");
    }

    // Update the role
    const { data: existingRole, error: existingRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRoleError) {
      throw new Error("Failed to check existing role: " + existingRoleError.message);
    }

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (updateError) {
        throw new Error("Failed to update role: " + updateError.message);
      }
    } else {
      // Insert new role
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (insertError) {
        throw new Error("Failed to create role: " + insertError.message);
      }
    }

    console.log(`Role updated for user ${userId}: ${existingRole?.role || 'none'} -> ${newRole}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        previousRole: existingRole?.role || null,
        newRole: newRole,
        message: "User role updated successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating user role:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
