import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/** Cryptographically random 6-digit code, rejection-sampled to stay uniform. */
function generateCode(): string {
  const bytes = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value >= 4_294_000_000); // drop the biased tail
  return String(value % 1_000_000).padStart(6, "0");
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function emailHtml(code: string, name: string | null): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(76,54,40,0.08);">
            <tr>
              <td style="background:#3d2b1f;padding:28px 32px;text-align:center;">
                <h1 style="margin:0;color:#f5f1ea;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;">Nawa Cafe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#3d2b1f;font-size:16px;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 24px;color:#6b5b4d;font-size:15px;line-height:1.6;">
                  Use this code to confirm your email and activate your Nawa Cafe account.
                </p>
                <div style="margin:0 0 24px;padding:20px;background:#f5f1ea;border-radius:12px;text-align:center;">
                  <span style="display:inline-block;color:#3d2b1f;font-size:34px;font-weight:700;letter-spacing:0.32em;padding-left:0.32em;">${code}</span>
                </div>
                <p style="margin:0 0 8px;color:#6b5b4d;font-size:14px;line-height:1.6;">
                  This code expires in ${CODE_TTL_MINUTES} minutes.
                </p>
                <p style="margin:0;color:#9b8b7d;font-size:13px;line-height:1.6;">
                  If you didn't create a Nawa Cafe account, you can ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #ece5db;text-align:center;">
                <p style="margin:0;color:#9b8b7d;font-size:12px;">Nawa Cafe — Al Ain</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Identify the caller from their session JWT — never trust a body-supplied id.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Not signed in" }, 401);
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
    if (userErr || !user?.email) {
      return json({ error: "Not signed in" }, 401);
    }

    // Already confirmed? Nothing to do.
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
        return json({
          error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code.`,
          retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
        }, 429);
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return json({ error: "Email service not configured" }, 500);
    }

    const code = generateCode();
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
        salt,
        expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      });
    if (insertErr) {
      console.error("Could not store verification code:", insertErr);
      return json({ error: "Could not create verification code" }, 500);
    }

    const from = Deno.env.get("RESEND_FROM") || "Nawa Cafe <onboarding@resend.dev>";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: `${code} is your Nawa Cafe confirmation code`,
        html: emailHtml(code, profile?.full_name ?? null),
        text: `${greetingText(profile?.full_name ?? null)}\n\nYour Nawa Cafe confirmation code is ${code}.\nIt expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't create a Nawa Cafe account, you can ignore this email.`,
      }),
    });

    const resendBody = await resendResponse.text();
    if (!resendResponse.ok) {
      console.error("Resend error:", resendResponse.status, resendBody);
      return json({ error: "Could not send the confirmation email" }, 502);
    }

    console.log("Verification code sent to", user.email);
    return json({ sent: true, expiresInMinutes: CODE_TTL_MINUTES });
  } catch (error) {
    console.error("send-verification-code failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});

function greetingText(name: string | null): string {
  return name ? `Hi ${name},` : "Hi,";
}
