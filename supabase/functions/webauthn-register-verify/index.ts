import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyRegistrationResponse } from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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

    const { response, deviceLabel } = await req.json();

    // Load and validate the stored challenge.
    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("challenge, expires_at")
      .eq("user_id", user.id)
      .eq("type", "registration")
      .maybeSingle();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: "No pending registration challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(challengeRow.expires_at) < new Date()) {
      await supabase.from("webauthn_challenges").delete()
        .eq("user_id", user.id).eq("type", "registration");
      return new Response(JSON.stringify({ error: "Registration challenge expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpId = Deno.env.get("WEBAUTHN_RP_ID") || "nawacafe.com";
    const origin = Deno.env.get("WEBAUTHN_ORIGIN") || `https://${rpId}`;

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: [origin, "http://localhost:8080", "http://localhost:5173"],
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    // Always delete the challenge (success or fail) — single use.
    await supabase.from("webauthn_challenges").delete()
      .eq("user_id", user.id).eq("type", "registration");

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ verified: false, error: "Verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await supabase.from("webauthn_credentials").insert({
      user_id: user.id,
      credential_id: toBase64url(credentialID),
      public_key: toBase64url(credentialPublicKey),
      counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: response.response?.transports ?? [],
      device_label: deviceLabel || null,
    });

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webauthn-register-verify error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
