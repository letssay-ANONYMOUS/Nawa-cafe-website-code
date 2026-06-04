import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@9.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fromBase64url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + padding);
  return new Uint8Array(binary.split("").map((c) => c.charCodeAt(0)));
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

    const { response } = await req.json();

    // Load challenge.
    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("challenge, expires_at")
      .eq("user_id", user.id)
      .eq("type", "authentication")
      .maybeSingle();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: "No pending authentication challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(challengeRow.expires_at) < new Date()) {
      await supabase.from("webauthn_challenges").delete()
        .eq("user_id", user.id).eq("type", "authentication");
      return new Response(JSON.stringify({ error: "Authentication challenge expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the matching credential by the credential ID returned from the authenticator.
    const credentialId: string = response.id; // base64url
    const { data: credential } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, public_key, counter, transports")
      .eq("user_id", user.id)
      .eq("credential_id", credentialId)
      .maybeSingle();

    if (!credential) {
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rpId = Deno.env.get("WEBAUTHN_RP_ID") || "nawacafe.com";
    const origin = Deno.env.get("WEBAUTHN_ORIGIN") || `https://${rpId}`;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: [origin, "http://localhost:8080", "http://localhost:5173"],
      expectedRPID: rpId,
      authenticator: {
        credentialID: fromBase64url(credential.credential_id),
        credentialPublicKey: fromBase64url(credential.public_key),
        counter: credential.counter,
        transports: credential.transports ?? [],
      },
      requireUserVerification: true,
    });

    // Always delete the challenge.
    await supabase.from("webauthn_challenges").delete()
      .eq("user_id", user.id).eq("type", "authentication");

    if (!verification.verified) {
      return new Response(JSON.stringify({ verified: false, error: "Biometric verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the signature counter (replay attack protection).
    await supabase.from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("user_id", user.id)
      .eq("credential_id", credentialId);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webauthn-auth-verify error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
