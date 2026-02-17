import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin token
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify admin session
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sessionSecret = Deno.env.get("SESSION_SECRET");
    const adminPasswordHash = Deno.env.get("ADMIN_PASSWORD_HASH");
    if (!sessionSecret || !adminPasswordHash) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Simple token validation: token must match a known admin session
    // The admin-session edge function validates the token format
    const { data: sessionCheck } = await fetch(
      `${supabaseUrl}/functions/v1/admin-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({}),
      }
    ).then(r => r.json());

    if (!sessionCheck?.valid) {
      return new Response(JSON.stringify({ error: "Invalid admin session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "full"; // "full" | "count"
    const startDate = url.searchParams.get("start_date");
    const paymentStatus = url.searchParams.get("payment_status");

    if (mode === "count") {
      // Return just the count of paid orders (for analytics)
      let query = supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      
      if (startDate) query = query.gte("created_at", startDate);
      if (paymentStatus) query = query.eq("payment_status", paymentStatus);

      const { count, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "visitor_ids") {
      // Return just visitor_ids (for analytics visitor details)
      let query = supabase.from("orders").select("visitor_id");
      if (startDate) query = query.gte("created_at", startDate);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full orders with items
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("created_at", startDate);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);

    const { data: ordersData, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    // Fetch order items
    let items: any[] = [];
    if (ordersData && ordersData.length > 0) {
      const orderIds = ordersData.map((o: any) => o.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;
      items = itemsData || [];
    }

    return new Response(
      JSON.stringify({ orders: ordersData || [], items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin orders error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
