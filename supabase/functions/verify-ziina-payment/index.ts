import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Postgres unique_violation — used to detect that this order's loyalty was
// already processed (idempotency guard via UNIQUE(order_id, type)).
const UNIQUE_VIOLATION = "23505";

/**
 * Apply the "buy N beverages, get the next free" loyalty rules for a freshly
 * paid order. Idempotent: the loyalty_events('earn') insert is the gate — if a
 * row for this order already exists, we bail out before touching any counter.
 */
async function processLoyaltyForPaidOrder(
  supabase: any,
  orderId: string,
  userId: string,
  freeDrinkAmount: number,
) {
  // Load config
  const { data: settingRows } = await supabase
    .from("kitchen_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["loyalty_enabled", "loyalty_threshold", "loyalty_reward_qty", "loyalty_eligible_categories"]);
  const settings = new Map((settingRows || []).map((r: any) => [r.setting_key, r.setting_value]));

  if ((settings.get("loyalty_enabled") ?? "true") === "false") return;

  const threshold = Math.max(1, Number(settings.get("loyalty_threshold")) || 10);
  const rewardQty = Math.max(1, Number(settings.get("loyalty_reward_qty")) || 1);
  let eligible: string[] = [];
  try { eligible = JSON.parse(settings.get("loyalty_eligible_categories") || "[]"); } catch { eligible = []; }
  if (eligible.length === 0) return;

  // Count eligible beverage units on this order.
  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, item_category")
    .eq("order_id", orderId);

  const eligibleQty = (items || [])
    .filter((it: any) => it.item_category && eligible.includes(it.item_category))
    .reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

  const redeemed = freeDrinkAmount > 0 ? 1 : 0;       // one free drink per order
  const paidBeverages = Math.max(0, eligibleQty - redeemed); // freebie doesn't count toward the next reward

  // Idempotency gate: claim this order for an 'earn' event. If it already
  // exists, loyalty for this order has been processed — stop here.
  const { error: earnErr } = await supabase
    .from("loyalty_events")
    .insert({ user_id: userId, order_id: orderId, type: "earn", beverages_counted: paidBeverages });
  if (earnErr) {
    if (earnErr.code === UNIQUE_VIOLATION) {
      console.log("Loyalty already processed for order", orderId);
      return;
    }
    throw earnErr;
  }

  // Load (or seed) the customer's counters.
  const { data: acct } = await supabase
    .from("loyalty_accounts")
    .select("paid_beverage_count, free_drinks_available, lifetime_free_redeemed")
    .eq("user_id", userId)
    .maybeSingle();
  let count = (acct?.paid_beverage_count ?? 0) + paidBeverages;
  let free = acct?.free_drinks_available ?? 0;
  let lifetime = acct?.lifetime_free_redeemed ?? 0;

  // Award free drinks for every full threshold reached.
  while (count >= threshold) {
    count -= threshold;
    free += rewardQty;
  }

  // Redeem the free drink applied to this order, if any.
  if (redeemed > 0) {
    free = Math.max(0, free - redeemed);
    lifetime += redeemed;
    await supabase
      .from("loyalty_events")
      .insert({ user_id: userId, order_id: orderId, type: "redeem", beverages_counted: 0 });
  }

  await supabase
    .from("loyalty_accounts")
    .upsert({
      user_id: userId,
      paid_beverage_count: count,
      free_drinks_available: free,
      lifetime_free_redeemed: lifetime,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  console.log("Loyalty updated for", userId, { paidBeverages, count, free, lifetime });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, order_id, shared_payment_id } = await req.json();

    console.log("Verifying payment:", { payment_id, order_id });

    // Validate required fields
    if (!order_id) {
      console.error("Missing order_id");
      return new Response(
        JSON.stringify({ success: false, error: "Missing order_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Supabase client with service role for database updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If no payment_id provided, look it up from the order
    let actualPaymentId = payment_id;
    if (!actualPaymentId) {
      const { data: orderLookup, error: lookupError } = await supabase
        .from("orders")
        .select("payment_reference")
        .eq("id", order_id)
        .single();

      if (lookupError || !orderLookup?.payment_reference) {
        return new Response(
          JSON.stringify({ success: false, error: "Order not found or missing payment reference" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      actualPaymentId = orderLookup.payment_reference;
    }

    // Get Ziina API token
    const ziinaToken = Deno.env.get("ZIINA_API_TOKEN") || Deno.env.get("ZIINA_API_KEY");
    if (!ziinaToken) {
      console.error("No Ziina token configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment gateway not configured",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Fetch payment status from Ziina API
    console.log("Fetching payment status from Ziina...");
    const ziinaResponse = await fetch(
      `https://api-v2.ziina.com/api/payment_intent/${actualPaymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ziinaToken}`,
        },
      }
    );

    const responseText = await ziinaResponse.text();
    console.log("Ziina status response:", ziinaResponse.status, responseText);

    let ziinaData: any;
    try {
      ziinaData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Ziina response");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from payment gateway",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Check if Ziina API returned an error
    if (!ziinaResponse.ok) {
      console.error("Ziina API error:", ziinaData);
      return new Response(
        JSON.stringify({
          success: false,
          error: ziinaData.message || "Failed to verify payment",
          status: ziinaData.status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const paymentStatus = ziinaData.status;
    console.log("Payment status from Ziina:", paymentStatus);

    // Check if payment is completed
    if (paymentStatus === "completed") {
      // Verify the order exists and matches the payment reference
      const { data: existingOrder, error: fetchError } = await supabase
        .from("orders")
        .select("id, order_number, payment_status, payment_reference, user_id, loyalty_free_drink_amount")
        .eq("id", order_id)
        .single();

      if (fetchError || !existingOrder) {
        console.error("Order not found:", fetchError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Order not found",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }

      // Security: Verify payment reference matches
      if (existingOrder.payment_reference !== actualPaymentId) {
        console.error("Payment reference mismatch:", {
          expected: existingOrder.payment_reference,
          received: actualPaymentId,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment reference mismatch",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Only update if still pending (idempotency)
      if (existingOrder.payment_status === "pending") {
        console.log("Updating order to paid:", order_id);
        
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: "card",
          })
          .eq("id", order_id)
          .eq("payment_status", "pending"); // Double-check for race conditions

        if (updateError) {
          console.error("Failed to update order:", updateError);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Failed to update order status",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }

        console.log("Order updated to paid successfully");

        // Loyalty: count paid beverages + grant/redeem free drinks. Runs only
        // on the pending→paid transition, and is further guarded by the
        // UNIQUE(order_id, type) constraint on loyalty_events (see helper).
        if (existingOrder.user_id) {
          try {
            await processLoyaltyForPaidOrder(
              supabase,
              existingOrder.id,
              existingOrder.user_id,
              Number(existingOrder.loyalty_free_drink_amount) || 0,
            );
          } catch (e) {
            console.error("Loyalty processing failed (order still paid):", e);
          }
        }
      } else {
        console.log("Order already marked as:", existingOrder.payment_status);
      }

      // Mark the linked shared payment as paid, if any. Only allowed once
      // payment is confirmed completed by Ziina.
      if (shared_payment_id) {
        const { error: spErr } = await supabase
          .from("shared_payments")
          .update({ paid_order_id: order_id })
          .eq("id", shared_payment_id)
          .is("paid_order_id", null);
        if (spErr) {
          console.error("Failed to mark shared payment as paid:", spErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          order_number: existingOrder.order_number,
          payment_status: "paid",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Payment not completed yet
      console.log("Payment not completed, status:", paymentStatus);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not completed",
          payment_status: paymentStatus,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    const message = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
