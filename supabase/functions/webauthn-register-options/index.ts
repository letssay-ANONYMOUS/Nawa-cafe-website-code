import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateRegistrationOptions } from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolveRpId(req: Request): string {
  const fallbackRpId = Deno.env.get("WEBAUTHN_RP_ID") || "nawacafe.com";
  const origin = req.headers.get("Origin") || Deno.env.get("WEBAUTHN_ORIGIN") || `https://${fallbackRpId}`;

  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return hostname;
    if (hostname === "nawacafe.com" || hostname === "www.nawacafe.com") return "nawacafe.com";
    if (hostname.endsWith(".vercel.app")) return hostname;
  } catch {
    // Use configured/default RP ID below.
  }

  return fallbackRpId;
}

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

    const rpId = resolveRpId(req);

    // Fetch existing credentials so we can exclude them (prevents re-enrollment of same device).
    const { data: existing } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    // Prune any stale challenges for this user + type.
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration")
      .lt("expires_at", new Date().toISOString());

    const options = await generateRegistrationOptions({
      rpName: "Nawa Cafe",
      rpID: rpId,
      userName: user.email || user.id,
      userDisplayName: (user.user_metadata?.full_name as string) || user.email || "Customer",
      userID: new TextEncoder().encode(user.id),
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",   // platform = Face ID / fingerprint only
        userVerification: "required",
        residentKey: "preferred",
      },
      excludeCredentials: (existing || []).map((c) => ({
        id: c.credential_id,
        type: "public-key" as const,
        transports: c.transports ?? [],
      })),
      timeout: 60_000,
    });

    // Persist the challenge (upsert replaces any previous registration challenge).
    await supabase.from("webauthn_challenges").upsert({
      user_id: user.id,
      type: "registration",
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }, { onConflict: "user_id,type" });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webauthn-register-options error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
