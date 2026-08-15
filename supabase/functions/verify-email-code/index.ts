import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time compare so timing can't leak the expected hash. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    // Codes are lowercase alphanumeric; accept whatever case the customer typed
    // and strip spaces so a pasted code still works.
    const submitted = String(code ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (!/^[a-z0-9]{6}$/.test(submitted)) {
      return json({ error: "Enter the 6-character code from your email." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Not signed in" }, 401);
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (userErr || !user) {
      return json({ error: "Not signed in" }, 401);
    }

    const { data: record } = await supabase
      .from("email_verification_codes")
      .select("id, code_hash, salt, attempts, expires_at, consumed_at")
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return json({ error: "No active code. Request a new one." }, 400);
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return json({ error: "That code expired. Request a new one." }, 400);
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return json({ error: "Too many incorrect attempts. Request a new code." }, 429);
    }

    const submittedHash = await hashCode(submitted, record.salt);
    if (!timingSafeEqual(submittedHash, record.code_hash)) {
      await supabase
        .from("email_verification_codes")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return json({
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : "Too many incorrect attempts. Request a new code.",
      }, 400);
    }

    const now = new Date().toISOString();
    await supabase
      .from("email_verification_codes")
      .update({ consumed_at: now })
      .eq("id", record.id);

    const { error: profileErr } = await supabase
      .from("customer_profiles")
      .update({ email_verified_at: now })
      .eq("user_id", user.id);
    if (profileErr) {
      console.error("Could not mark profile verified:", profileErr);
      return json({ error: "Could not confirm your email. Please try again." }, 500);
    }

    // Also flag the address confirmed at the auth layer.
    const { error: adminErr } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (adminErr) {
      console.warn("Could not set email_confirm on auth user:", adminErr);
    }

    console.log("Email verified for", user.id);
    return json({ verified: true });
  } catch (error) {
    console.error("verify-email-code failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
