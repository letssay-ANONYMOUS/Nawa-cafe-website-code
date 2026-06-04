import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateAuthenticationOptions } from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpId = Deno.env.get("WEBAUTHN_RP_ID") || "nawacafe.com";

    // Load this user's registered credentials.
    const { data: credentials } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (!credentials || credentials.length === 0) {
      return new Response(JSON.stringify({ error: "No credentials registered for this user" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prune stale challenges.
    await supabase.from("webauthn_challenges").delete()
      .eq("user_id", user.id).eq("type", "authentication")
      .lt("expires_at", new Date().toISOString());

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "required",
      allowCredentials: credentials.map((c) => ({
        id: c.credential_id,
        type: "public-key" as const,
        transports: c.transports ?? [],
      })),
      timeout: 60_000,
    });

    await supabase.from("webauthn_challenges").upsert({
      user_id: user.id,
      type: "authentication",
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }, { onConflict: "user_id,type" });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webauthn-auth-options error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
