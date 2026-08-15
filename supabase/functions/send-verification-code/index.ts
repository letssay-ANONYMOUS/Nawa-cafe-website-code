import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;
const REUSE_WINDOW_DAYS = 60; // a code may not be handed out again for 2 months

// Lowercase only (uppercase is tiring to type on phones) and without the
// look-alike characters l / o / 0 / 1 so a mistyped code is far less likely.
const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/** Random lowercase alphanumeric code, rejection-sampled to stay uniform. */
function generateCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    if (buf[0] >= limit) continue; // drop the biased tail
    out.push(CODE_ALPHABET[buf[0] % CODE_ALPHABET.length]);
  }
  return out.join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const hashCode = (code: string, salt: string) => sha256Hex(`${salt}:${code}`);

/** Deterministic, secret-keyed fingerprint used only for the no-repeat check. */
async function fingerprintCode(code: string): Promise<string> {
  const pepper = Deno.env.get("CODE_PEPPER") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string
  ));
}

function emailHtml(code: string, name: string | null): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(76,54,40,0.08);">
          <tr>
            <td style="background:#3d2b1f;padding:30px 32px;text-align:center;">
              <h1 style="margin:0;color:#f5f1ea;font-size:22px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">Nawa Cafe</h1>
              <p style="margin:6px 0 0;color:#c9b8a4;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Al Ain</p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px 8px;">
              <p style="margin:0 0 14px;color:#3d2b1f;font-size:17px;font-weight:600;">${greeting}</p>
              <p style="margin:0 0 26px;color:#6b5b4d;font-size:15px;line-height:1.65;">
                Welcome to Nawa Cafe. Enter the confirmation code below to verify your email
                and activate your rewards account.
              </p>
              <div style="margin:0 0 14px;padding:22px;background:#f5f1ea;border:1px solid #e6dccd;border-radius:12px;text-align:center;">
                <p style="margin:0 0 10px;color:#9b8b7d;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Your confirmation code</p>
                <span style="display:inline-block;color:#3d2b1f;font-size:34px;font-weight:700;letter-spacing:0.3em;padding-left:0.3em;font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</span>
              </div>
              <p style="margin:0 0 28px;color:#9b8b7d;font-size:13px;line-height:1.6;text-align:center;">
                This code expires in ${CODE_TTL_MINUTES} minutes and can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <div style="border-top:1px solid #ece5db;padding-top:26px;">
                <p style="margin:0 0 16px;color:#3d2b1f;font-size:15px;font-weight:600;">What's waiting for you</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 0 12px;color:#6b5b4d;font-size:14px;line-height:1.6;">
                      <strong style="color:#3d2b1f;">Digital stamp card</strong><br>
                      Collect a stamp with every qualifying order and earn a free item on the house.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;color:#6b5b4d;font-size:14px;line-height:1.6;">
                      <strong style="color:#3d2b1f;">Faster ordering</strong><br>
                      Your details are saved, so pickup, delivery and dine-in checkout take seconds.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 4px;color:#6b5b4d;font-size:14px;line-height:1.6;">
                      <strong style="color:#3d2b1f;">Member offers</strong><br>
                      Seasonal discounts and new-menu previews land in your account first.
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 30px;">
              <p style="margin:0 0 6px;color:#6b5b4d;font-size:14px;line-height:1.65;">
                We're glad to have you with us — happy dining, and see you at the counter.
              </p>
              <p style="margin:0;color:#3d2b1f;font-size:14px;font-weight:600;">The Nawa Cafe team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #ece5db;text-align:center;">
              <p style="margin:0 0 6px;color:#9b8b7d;font-size:12px;line-height:1.6;">
                Didn't create a Nawa Cafe account? You can safely ignore this email — no account will be activated.
              </p>
              <p style="margin:0;color:#b6a795;font-size:12px;">Nawa Cafe · Al Ain, United Arab Emirates</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function emailText(code: string, name: string | null): string {
  return `${name ? `Hi ${name},` : "Hi there,"}

Welcome to Nawa Cafe. Use the confirmation code below to verify your email and activate your rewards account.

Your confirmation code: ${code}

This code expires in ${CODE_TTL_MINUTES} minutes and can only be used once.

WHAT'S WAITING FOR YOU
- Digital stamp card: collect a stamp with every qualifying order and earn a free item on the house.
- Faster ordering: your details are saved, so pickup, delivery and dine-in checkout take seconds.
- Member offers: seasonal discounts and new-menu previews land in your account first.

We're glad to have you with us - happy dining, and see you at the counter.
The Nawa Cafe team

Didn't create a Nawa Cafe account? You can safely ignore this email - no account will be activated.
Nawa Cafe - Al Ain, United Arab Emirates`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify the caller from their session JWT — never trust a body-supplied id.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Not signed in" }, 401);
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (userErr || !user?.email) {
      return json({ error: "Not signed in" }, 401);
    }

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("full_name, email_verified_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.email_verified_at) {
      return json({ alreadyVerified: true });
    }

    // Throttle resends.
    const { data: recent } = await supabase
      .from("email_verification_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.created_at) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return json({ error: `Please wait ${wait}s before requesting another code.`, retryAfter: wait }, 429);
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return json({ error: "Email service not configured" }, 500);
    }

    // Draw a code that has not been issued to ANY customer in the reuse window.
    const reuseCutoff = new Date(Date.now() - REUSE_WINDOW_DAYS * 86_400_000).toISOString();
    let code = "";
    let fingerprint = "";
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = generateCode();
      const candidateFingerprint = await fingerprintCode(candidate);
      const { data: clash } = await supabase
        .from("email_verification_codes")
        .select("id")
        .eq("code_fingerprint", candidateFingerprint)
        .gte("created_at", reuseCutoff)
        .limit(1)
        .maybeSingle();
      if (!clash) {
        code = candidate;
        fingerprint = candidateFingerprint;
        break;
      }
    }
    if (!code) {
      console.error("Could not find an unused code after 12 attempts");
      return json({ error: "Could not generate a code. Please try again." }, 500);
    }

    const salt = crypto.randomUUID();
    const codeHash = await hashCode(code, salt);

    // Invalidate any outstanding codes, then store the new one.
    await supabase
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("consumed_at", null);

    const { error: insertErr } = await supabase
      .from("email_verification_codes")
      .insert({
        user_id: user.id,
        email: user.email,
        code_hash: codeHash,
        code_fingerprint: fingerprint,
        salt,
        expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      });
    if (insertErr) {
      console.error("Could not store verification code:", insertErr);
      return json({ error: "Could not create verification code" }, 500);
    }

    const from = Deno.env.get("RESEND_FROM") || "Nawa Cafe <noreply@nawacafe.com>";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: `${code} is your Nawa Cafe confirmation code`,
        html: emailHtml(code, profile?.full_name ?? null),
        text: emailText(code, profile?.full_name ?? null),
      }),
    });

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResponse.status, await resendResponse.text());
      return json({ error: "Could not send the confirmation email" }, 502);
    }

    console.log("Verification code sent to", user.email);
    return json({ sent: true, expiresInMinutes: CODE_TTL_MINUTES, codeLength: CODE_LENGTH });
  } catch (error) {
    console.error("send-verification-code failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
