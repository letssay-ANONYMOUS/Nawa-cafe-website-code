import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A referral may only be claimed by a genuinely new account, so codes cannot be
// applied retroactively by long-standing customers.
const CLAIM_WINDOW_MINUTES = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    const submitted = String(code ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (!/^[a-z0-9]{6}$/.test(submitted)) {
      return json({ error: "That referral code doesn't look right." }, 400);
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

    // Referral programme switched off?
    const { data: settingRows } = await supabase
      .from("kitchen_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "referral_enabled")
      .maybeSingle();
    if ((settingRows?.setting_value ?? "true") === "false") {
      return json({ error: "The referral programme is not running right now." }, 400);
    }

    // One referral per customer, ever.
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();
    if (existing) {
      return json({ error: "You've already used a referral code." }, 400);
    }

    // Only brand-new accounts may claim.
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("created_at, referral_code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.created_at) {
      const ageMinutes = (Date.now() - new Date(profile.created_at).getTime()) / 60_000;
      if (ageMinutes > CLAIM_WINDOW_MINUTES) {
        return json({ error: "Referral codes can only be applied when you first sign up." }, 400);
      }
    }
    if (profile?.referral_code === submitted) {
      return json({ error: "You can't refer yourself." }, 400);
    }

    // Resolve the code to its owner.
    const { data: referrer } = await supabase
      .from("customer_profiles")
      .select("user_id")
      .eq("referral_code", submitted)
      .maybeSingle();
    if (!referrer) {
      return json({ error: "We couldn't find that referral code." }, 404);
    }
    if (referrer.user_id === user.id) {
      return json({ error: "You can't refer yourself." }, 400);
    }

    const { error: insertErr } = await supabase.from("referrals").insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: user.id,
      code_used: submitted,
      status: "pending",
    });
    if (insertErr) {
      console.error("Could not record referral:", insertErr);
      return json({ error: "Could not apply that referral code." }, 500);
    }

    console.log("Referral claimed:", submitted, "->", user.id);
    return json({
      claimed: true,
      message: "Referral applied. Your friend earns stamps once you complete your first order.",
    });
  } catch (error) {
    console.error("claim-referral failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
