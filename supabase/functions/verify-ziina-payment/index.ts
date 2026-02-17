import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, order_id } = await req.json();

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
        .select("id, order_number, payment_status, payment_reference")
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
      } else {
        console.log("Order already marked as:", existingOrder.payment_status);
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
