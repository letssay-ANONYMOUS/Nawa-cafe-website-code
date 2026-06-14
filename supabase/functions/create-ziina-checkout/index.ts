import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNLISTED_DELIVERY_AREA = "My area isn't listed";

// Owner-editable delivery fee table from the latest delivery spreadsheet.
// Keep this in sync with src/lib/delivery.ts.
const DISTRICT_DELIVERY_FEE = {
  "Al Bateen": 15,
  "Al Dhaher": 20,
  "Al Foah": 20,
  "Al Jahili": 15,
  "Al Jimi": 15,
  "Al Khabisi": 15,
  "Al Khrair": 20,
  "Al Maqam": 15,
  "Al Markhaniya": 15,
  "Al Masoudi": 15,
  "Al Mutaredh": 15,
  "Al Mutawaa": 15,
  "Al Muwaiji": 15,
  "Al Niyadat": 15,
  "Al Qattara": 15,
  "Al Salamat": 15,
  "Al Saniya": 15,
  "Al Sarooj": 15,
  "Al Shuaibah": 20,
  "Al Towayya": 15,
  "Al Yahar": 25,
  Asharej: 15,
  "Central District": 15,
  "Falaj Hazza": 15,
  Hili: 20,
  Neima: 20,
  Tawam: 15,
  Zakhir: 15,
} as const;

type DeliveryArea = keyof typeof DISTRICT_DELIVERY_FEE;
type DeliveryZone = "standard" | "extended" | "remote";
type OrderFulfillment = "dine_in" | "delivery";

function getDeliveryZone(area: string): DeliveryZone | null {
  const fee = DISTRICT_DELIVERY_FEE[area as DeliveryArea];
  if (fee === 15) return "standard";
  if (fee === 20) return "extended";
  if (fee === 25) return "remote";
  return null;
}

function calculateDelivery(area: string, subtotal: number): {
  area: string;
  zone: DeliveryZone | null;
  fee: number | null;
  isTbc: boolean;
} | null {
  if (!area) return null;
  if (area === UNLISTED_DELIVERY_AREA) {
    return { area, zone: null, fee: null, isTbc: true };
  }

  const zone = getDeliveryZone(area);
  if (!zone) return null;

  return {
    area,
    zone,
    fee: DISTRICT_DELIVERY_FEE[area as DeliveryArea],
    isTbc: false,
  };
}

function normalizeOrderType(value: unknown): OrderFulfillment {
  return value === "dine_in" ? "dine_in" : "delivery";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, phoneNumber, customerEmail, orderItems: bodyOrderItems, additionalNotes, visitorId, selectedBranch, discountCode, sharedPaymentId, deliveryArea, orderType } = await req.json();
    let orderItems = bodyOrderItems;
    const normalizedOrderType = normalizeOrderType(orderType);
    const customerLocation = selectedBranch ? `${selectedBranch} (manual)` : "Unknown";

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

    // Identify the customer if they are signed in. supabase-js attaches the
    // user's JWT as the Authorization bearer when a session exists; anonymous
    // callers send the anon key (which getUser rejects → userId stays null).
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      }
    } catch (e) {
      console.warn("Could not resolve customer from auth header:", e);
    }

    let serverTotal = 0;
    const validatedItems: any[] = [];

    let sharedPaymentTotal: number | null = null;
    if (sharedPaymentId) {
      // Trusted server-side cart from shared_payments — supports store + menu items
      const { data: spRow, error: spErr } = await supabase
        .from('shared_payments')
        .select('cart, subtotal, total, paid_order_id, expires_at')
        .eq('id', sharedPaymentId)
        .maybeSingle();
      if (spErr || !spRow) {
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: "Shared payment link not found" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      if (spRow.paid_order_id) {
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: "This shared order has already been paid" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      if (new Date(spRow.expires_at).getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: "This shared payment link has expired" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      const cart = Array.isArray(spRow.cart) ? spRow.cart : [];
      for (const it of cart) {
        const price = Number(it.price);
        const qty = Number(it.quantity);
        if (!Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 1) continue;
        serverTotal += price * qty;
        validatedItems.push({ name: it.name, price, quantity: qty, category: it.category || null });
      }
      orderItems = validatedItems;
      // Use the exact total saved on the shared payment row — no loyalty or
      // promo discounts are applied to shared links; the payer pays exactly
      // what is shown on the share page.
      sharedPaymentTotal = Number(spRow.total);
    } else {
      // ===== SERVER-SIDE PRICE VALIDATION (regular cart) =====
      const itemNames = orderItems.map((item: any) => item.name);
      const { data: dbItems, error: menuError } = await supabase
        .from('menu_items')
        .select('title, price, category')
        .in('title', itemNames)
        .eq('published', true);

      if (menuError) {
        console.error("Error fetching menu items for validation:", menuError);
        return new Response(
          JSON.stringify({ error: { provider: "validation", message: "Failed to validate prices" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const priceMap = new Map<string, number>();
      const categoryMap = new Map<string, string | null>();
      for (const item of dbItems || []) {
        priceMap.set(item.title, Number(item.price));
        categoryMap.set(item.title, item.category ?? null);
      }

      // Staff-created cards may exist only in menu_cards (no menu_items row).
      // Validate those by name against menu_cards, parsing the numeric price
      // (strip commas first so large prices like "99,999.00" parse correctly).
      const missingNames = itemNames.filter((n: string) => !priceMap.has(n));
      if (missingNames.length > 0) {
        const { data: dbCards } = await supabase
          .from('menu_cards')
          .select('name, price')
          .in('name', missingNames);
        for (const c of dbCards || []) {
          const m = String(c.price ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
          if (c.name && m) {
            priceMap.set(c.name, parseFloat(m[0]));
            categoryMap.set(c.name, null);
          }
        }

        // Store products — only sellable ones (not coming-soon and in stock).
        const stillMissing = missingNames.filter((n: string) => !priceMap.has(n));
        if (stillMissing.length > 0) {
          const { data: dbStore } = await supabase
            .from('store_products')
            .select('product_name, price, coming_soon, stock_quantity')
            .in('product_name', stillMissing);
          for (const s of dbStore || []) {
            if (s.product_name && !s.coming_soon && Number(s.stock_quantity ?? 0) > 0) {
              priceMap.set(s.product_name, Number(s.price));
              categoryMap.set(s.product_name, 'store');
            }
          }
        }
      }

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
        // Trust the DB category (not the client-sent one) for loyalty eligibility.
        validatedItems.push({ ...item, price: dbPrice, category: categoryMap.get(item.name) ?? item.category ?? null });
      }
    }

    const subtotalAmount = Math.round(serverTotal * 100) / 100;

    const delivery = sharedPaymentId || normalizedOrderType === "dine_in"
      ? { area: null, zone: null, fee: 0, isTbc: false }
      : calculateDelivery(typeof deliveryArea === "string" ? deliveryArea : "", subtotalAmount);

    if (!delivery) {
      return new Response(
        JSON.stringify({ error: { provider: "validation", message: "Please choose a valid delivery area" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const deliveryFee = delivery.fee ?? 0;

    // Apply loyalty discount — percent is configurable via kitchen_settings
    // (key: "loyalty_discount_percent"). Defaults to 15 if unset, 0 disables.
    let loyaltyPercent = 15;
    try {
      const { data: lpRow } = await supabase
        .from("kitchen_settings")
        .select("setting_value")
        .eq("setting_key", "loyalty_discount_percent")
        .maybeSingle();
      if (lpRow?.setting_value !== undefined && lpRow?.setting_value !== null) {
        const parsed = Number(lpRow.setting_value);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
          loyaltyPercent = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load loyalty_discount_percent, using default 15%", e);
    }
    const DISCOUNT_RATE = loyaltyPercent / 100;
    const loyaltyDiscount = Math.round(serverTotal * DISCOUNT_RATE * 100) / 100;


    // ===== PROMO CODE VALIDATION (server-side) =====
    let appliedCode: string | null = null;
    let codeDiscount = 0;
    if (discountCode && typeof discountCode === "string") {
      const { data: codeRows, error: codeErr } = await supabase.rpc("validate_discount_code", {
        _code: discountCode,
      });
      if (codeErr) {
        console.warn("Discount code validation failed:", codeErr);
      } else if (Array.isArray(codeRows) && codeRows[0]) {
        const row = codeRows[0] as { code: string; percent: number; scope: string; target_source: string | null; target_name: string | null };
        const pct = Math.min(100, Math.max(0, Number(row.percent))) / 100;
        if (row.scope === "cart") {
          codeDiscount = serverTotal * pct;
        } else if (row.scope === "item" && row.target_name) {
          const target = row.target_name.trim().toLowerCase();
          for (const it of validatedItems) {
            if (String(it.name).trim().toLowerCase() === target) {
              codeDiscount += it.price * it.quantity * pct;
            }
          }
        }
        codeDiscount = Math.round(codeDiscount * 100) / 100;
        appliedCode = row.code;
        console.log("Applied promo code:", appliedCode, "discount:", codeDiscount);
      } else {
        console.log("Discount code not valid:", discountCode);
      }
    }

    // ===== LOYALTY FREE DRINK (buy N beverages, get the next free) =====
    // Auto-applied for signed-in customers who have a free drink banked and an
    // eligible beverage in the cart. Not applied to shared-payment links.
    let loyaltyFreeDrinkAmount = 0;
    if (userId && !sharedPaymentId) {
      try {
        const { data: settingRows } = await supabase
          .from("kitchen_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["loyalty_enabled", "loyalty_eligible_categories"]);
        const settings = new Map((settingRows || []).map((r: any) => [r.setting_key, r.setting_value]));
        const enabled = (settings.get("loyalty_enabled") ?? "true") !== "false";

        let eligible: string[] = [];
        try { eligible = JSON.parse(settings.get("loyalty_eligible_categories") || "[]"); } catch { eligible = []; }

        if (enabled && eligible.length > 0) {
          const { data: loyalty } = await supabase
            .from("loyalty_accounts")
            .select("free_drinks_available")
            .eq("user_id", userId)
            .maybeSingle();

          if ((loyalty?.free_drinks_available ?? 0) > 0) {
            // Free drink = the cheapest eligible beverage unit in the cart.
            const prices = validatedItems
              .filter((it) => it.category && eligible.includes(it.category))
              .map((it) => Number(it.price))
              .filter((p) => Number.isFinite(p) && p > 0);
            if (prices.length > 0) {
              loyaltyFreeDrinkAmount = Math.round(Math.min(...prices) * 100) / 100;
            }
          }
        }
      } catch (e) {
        console.warn("Loyalty free-drink check failed (continuing without it):", e);
      }
    }

    const rawTotal = sharedPaymentTotal !== null
      ? sharedPaymentTotal
      : serverTotal - loyaltyDiscount - codeDiscount - loyaltyFreeDrinkAmount + deliveryFee;
    const amount = Math.max(0, Math.round(rawTotal * 100) / 100);
    console.log("Server-validated subtotal:", subtotalAmount, "loyalty:", loyaltyDiscount, "promo:", codeDiscount, "freeDrink:", loyaltyFreeDrinkAmount, "delivery:", deliveryFee, "shared:", sharedPaymentTotal, "final:", amount);

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
      const subtotal = subtotalAmount;

      // Insert order into database (without payment reference yet)
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          visitor_id: visitorId || 'unknown',
          user_id: userId,
          customer_name: customerName,
          customer_phone: phoneNumber,
          customer_email: customerEmail || null,
          extra_notes: additionalNotes || null,
          subtotal: subtotal,
          total_amount: amount,
          loyalty_free_drink_amount: loyaltyFreeDrinkAmount,
          payment_status: 'pending',
          payment_provider: 'ziina',
          order_type: normalizedOrderType,
          ip_address: null,
          customer_location: customerLocation,
          applied_discount_code: appliedCode,
          code_discount_amount: codeDiscount,
          delivery_area: delivery.area,
          delivery_zone: delivery.zone,
          delivery_fee: delivery.fee,
          delivery_fee_tbc: delivery.isTbc,
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
    // (and shared_payment_id when applicable, so verification can mark the
    // shared link as paid only after a confirmed payment)
    const successUrl = sharedPaymentId
      ? `${origin}/payment-success?order_id=${orderData.id}&sp=${sharedPaymentId}`
      : `${origin}/payment-success?order_id=${orderData.id}`;
    const paymentBody = {
      ...basePaymentBody,
      success_url: successUrl,
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

    // NOTE: do NOT mark the shared payment as paid here. It is only marked
    // paid after Ziina confirms the payment in verify-ziina-payment.


    return new Response(
      JSON.stringify({
        url: ziinaData.redirect_url,
        paymentIntentId: ziinaData.id,
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        deliveryFee: delivery.fee,
        deliveryFeeTbc: delivery.isTbc,
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
