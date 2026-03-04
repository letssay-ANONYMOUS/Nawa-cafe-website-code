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

    // Resolve IP to district-level location
    let customerLocation = "Unknown";
    if (customerIp && customerIp !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${customerIp}?fields=status,city,regionName,country,district,zip,lat,lon`);
        const geo = await geoRes.json();
        if (geo.status === "success") {
          // Build granular location: district > city > region > country
          const parts = [geo.district, geo.city, geo.regionName, geo.country].filter(Boolean);
          // Remove duplicates (e.g. if district == city)
          const unique = [...new Set(parts)];
          customerLocation = unique.join(", ") || "Unknown";
          console.log("Geolocation resolved:", customerLocation);
        } else {
          console.warn("Geolocation failed for IP:", customerIp);
        }
      } catch (geoErr) {
        console.warn("Geolocation API error:", geoErr);
      }
    }

    const { customerName, phoneNumber, orderItems, additionalNotes, visitorId } = await req.json();

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
    const webhookUrl = new URL('https://hoi-there.app.n8n.cloud/webhook/ca4ea201-6cb4-4476-b7b5-d5c12894f9b1');
    webhookUrl.searchParams.append('customerName', customerName || '');
    webhookUrl.searchParams.append('phoneNumber', phoneNumber || '');
    webhookUrl.searchParams.append('time', new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' }));
    webhookUrl.searchParams.append('totalAmount', String(amount));
    webhookUrl.searchParams.append('currency', 'AED');
    webhookUrl.searchParams.append('items', JSON.stringify(orderItems || []));
    webhookUrl.searchParams.append('notes', additionalNotes || '');
    webhookUrl.searchParams.append('paymentIntentId', ziinaData.id);
    webhookUrl.searchParams.append('orderNumber', orderData.order_number);

    // Fire and forget webhook
    fetch(webhookUrl.toString(), { method: 'GET' }).catch(e => console.warn('Webhook failed:', e));

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
