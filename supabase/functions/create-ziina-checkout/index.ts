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
    // ===== CAPTURE CUSTOMER IP =====
    const forwardedFor = req.headers.get("x-forwarded-for");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const realIp = req.headers.get("x-real-ip");
    const customerIp = cfConnectingIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp || null;
    console.log("Customer IP:", customerIp);

    const { customerName, phoneNumber, orderItems, additionalNotes, visitorId, latitude, longitude, selectedBranch } = await req.json();

    // ===== BRANCH DETECTION =====
    // Two Nawa Cafe branches in Al Ain
    const BRANCHES = [
      { name: "Stadhazza Branch", lat: 24.2167, lon: 55.7708 },
      { name: "Municipality Branch", lat: 24.2075, lon: 55.7447 },
    ];

    function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    let customerLocation = "Unknown";
    if (typeof latitude === "number" && typeof longitude === "number") {
      // GPS coordinates available — calculate nearest branch
      const distances = BRANCHES.map(b => ({
        name: b.name,
        distance: haversineKm(latitude, longitude, b.lat, b.lon),
      }));
      distances.sort((a, b) => a.distance - b.distance);
      const nearest = distances[0];
      customerLocation = `${nearest.name} — ${nearest.distance.toFixed(1)} km`;
      console.log("GPS branch detection:", customerLocation, `(coords: ${latitude}, ${longitude})`);
    } else if (selectedBranch) {
      // Manual branch selection fallback
      customerLocation = `${selectedBranch} (manual)`;
      console.log("Manual branch selection:", customerLocation);
    } else if (customerIp && customerIp !== "127.0.0.1") {
      // Fallback to IP geolocation
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${customerIp}?fields=status,city,regionName,country,district,zip,lat,lon`);
        const geo = await geoRes.json();
        if (geo.status === "success") {
          const parts = [geo.district, geo.city, geo.regionName, geo.country].filter(Boolean);
          const unique = [...new Set(parts)];
          customerLocation = unique.join(", ") || "Unknown";
          console.log("IP geolocation fallback:", customerLocation);
        }
      } catch (geoErr) {
        console.warn("Geolocation API error:", geoErr);
      }
    }

    console.log("Checkout request:", { customerName, phoneNumber, itemCount: orderItems?.length, visitorId });

    // Validate required fields
    if (!customerName || !phoneNumber || !orderItems || orderItems.length === 0) {
      return new Response(
        JSON.stringify({ error: { provider: "validation", message: "Missing required fields" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== SERVER-SIDE PRICE VALIDATION =====
    // Fetch actual prices from database to prevent client-side manipulation
    const itemNames = orderItems.map((item: any) => item.name);
    const { data: dbItems, error: menuError } = await supabase
      .from('menu_items')
      .select('title, price')
      .in('title', itemNames)
      .eq('published', true);

    if (menuError) {
      console.error("Error fetching menu items for validation:", menuError);
      return new Response(
        JSON.stringify({ error: { provider: "validation", message: "Failed to validate prices" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build a price lookup map from database
    const priceMap = new Map<string, number>();
    for (const item of dbItems || []) {
      priceMap.set(item.title, Number(item.price));
    }

    // Validate each item and calculate server-side total
    let serverTotal = 0;
    const validatedItems: any[] = [];
    for (const item of orderItems) {
      const dbPrice = priceMap.get(item.name);
      if (dbPrice === undefined) {
        console.error(`Item not found in menu: ${item.name}`);
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: `Item "${item.name}" not found in menu` } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: `Invalid quantity for "${item.name}"` } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      serverTotal += dbPrice * qty;
      validatedItems.push({ ...item, price: dbPrice }); // Use DB price
    }

    const amount = Math.round(serverTotal * 100) / 100; // Round to 2 decimals
    console.log("Server-validated total:", amount);

    // Get Ziina API token
    const ziinaToken = Deno.env.get("ZIINA_API_TOKEN") || Deno.env.get("ZIINA_API_KEY");
    if (!ziinaToken) {
      console.error("No Ziina token configured");
      return new Response(
        JSON.stringify({ error: { provider: "ziina", message: "Payment gateway not configured" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://cafe-delight-website-builder.lovable.app";

    const isPreviewOrigin =
      origin.includes("id-preview--") ||
      origin.includes("lovableproject.com") ||
      origin.includes("localhost");

    // Build payment request - amount in fils (base units)
    const amountInFils = Math.round(amount * 100);

    const basePaymentBody: Record<string, unknown> = {
      amount: amountInFils,
      currency_code: "AED",
      message: `Nawa Cafe - Order for ${customerName}`,
      cancel_url: `${origin}/checkout`,
      failure_url: `${origin}/checkout?error=payment_failed`,
      ...(isPreviewOrigin ? { test: true } : {}),
    };

    // ===== SAVE ORDER TO DATABASE FIRST =====
    // We need the order ID before creating Ziina payment to include in success URL
    let orderData: { id: string; order_number: string } | null = null;
    
    try {
      // Use server-validated prices
      const subtotal = amount;

      // Insert order into database (without payment reference yet)
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          visitor_id: visitorId || 'unknown',
          customer_name: customerName,
          customer_phone: phoneNumber,
          extra_notes: additionalNotes || null,
          subtotal: subtotal,
          total_amount: amount,
          payment_status: 'pending',
          payment_provider: 'ziina',
          order_type: 'dine_in',
          ip_address: customerIp,
          customer_location: customerLocation,
        })
        .select('id, order_number')
        .single();

      if (orderError) {
        console.error("Error inserting order:", orderError);
        return new Response(
          JSON.stringify({
            error: { provider: "database", message: "Failed to create order" },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      orderData = insertedOrder;
      console.log("Order created:", orderData);

      // Insert order items using validated prices from DB
      if (validatedItems && validatedItems.length > 0) {
        const orderItemsToInsert = validatedItems.map((item: any) => ({
          order_id: orderData!.id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price, // DB-validated price
          total_price: item.price * item.quantity,
          item_category: item.category || null,
          extras: item.extras || null,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) {
          console.error("Error inserting order items:", itemsError);
        } else {
          console.log("Order items created:", orderItemsToInsert.length);
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({
          error: { provider: "database", message: "Database error occurred" },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Now build the full payment body with success URL including order_id
    const paymentBody = {
      ...basePaymentBody,
      success_url: `${origin}/payment-success?order_id=${orderData.id}`,
    };

    console.log("Creating Ziina payment intent:", JSON.stringify(paymentBody));

    // Create Ziina payment intent
    const ziinaResponse = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ziinaToken}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const responseText = await ziinaResponse.text();
    console.log("Ziina response status:", ziinaResponse.status);
    console.log("Ziina response body:", responseText);

    let ziinaData: any;
    try {
      ziinaData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Ziina response");
      return new Response(
        JSON.stringify({
          error: { provider: "ziina", message: "Invalid response from payment gateway" },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check for errors in response
    if (!ziinaResponse.ok || ziinaData.error || ziinaData.message === "Unauthorized") {
      const errorMessage = ziinaData.message || ziinaData.error?.message || "Payment request failed";
      const errorCode = ziinaData.code || ziinaData.error?.code || ziinaData.statusCode;
      
      console.error("Ziina API error:", { status: ziinaResponse.status, code: errorCode, message: errorMessage });
      
      return new Response(
        JSON.stringify({
          error: {
            provider: "ziina",
            status: ziinaResponse.status,
            code: errorCode,
            message: errorMessage,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Success - we have a redirect URL
    if (!ziinaData.redirect_url) {
      console.error("No redirect URL in Ziina response:", ziinaData);
      return new Response(
        JSON.stringify({
          error: { provider: "ziina", message: "No payment URL received" },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("Payment intent created successfully:", ziinaData.id);

    // Update the order with the Ziina payment reference
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_reference: ziinaData.id })
      .eq('id', orderData.id);

    if (updateError) {
      console.error("Error updating order with payment reference:", updateError);
    }

    // Send order to n8n webhook (non-blocking)
    const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!n8nUrl) {
      console.warn('N8N_WEBHOOK_URL secret not set, skipping webhook');
    }
    const webhookUrl = new URL(n8nUrl || 'https://example.com/placeholder');
    webhookUrl.searchParams.append('customerName', customerName || '');
    webhookUrl.searchParams.append('phoneNumber', phoneNumber || '');
    webhookUrl.searchParams.append('time', new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' }));
    webhookUrl.searchParams.append('totalAmount', String(amount));
    webhookUrl.searchParams.append('currency', 'AED');
    webhookUrl.searchParams.append('items', JSON.stringify(orderItems || []));
    webhookUrl.searchParams.append('notes', additionalNotes || '');
    webhookUrl.searchParams.append('paymentIntentId', ziinaData.id);
    webhookUrl.searchParams.append('orderNumber', orderData.order_number);

    // Fire and forget webhook (only if URL is configured)
    if (n8nUrl) {
      fetch(webhookUrl.toString(), { method: 'GET' }).catch(e => console.warn('Webhook failed:', e));
    }

    return new Response(
      JSON.stringify({
        url: ziinaData.redirect_url,
        paymentIntentId: ziinaData.id,
        orderNumber: orderData.order_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    const message = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: { provider: "server", message },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
