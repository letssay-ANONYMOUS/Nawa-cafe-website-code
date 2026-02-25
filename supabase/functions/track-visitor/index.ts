import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TrackVisitorRequest {
  visitor_id: string;
  fingerprint?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  device_type?: string;
  screen_resolution?: string;
  timezone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get IP address from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Priority: CF > X-Forwarded-For > X-Real-IP
    let ipAddress = cfConnectingIp || (forwardedFor?.split(',')[0]?.trim()) || realIp || 'unknown';
    
    console.log('Track visitor request received');
    console.log('Resolved IP:', ipAddress);

    // Resolve IP to geolocation
    let country: string | null = null;
    let city: string | null = null;
    if (ipAddress !== 'unknown') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,city`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === 'success') {
            country = geo.country || null;
            city = geo.city || null;
            console.log('Geolocation resolved:', { country, city });
          }
        }
      } catch (e) {
        console.error('Geolocation lookup failed:', e);
      }
    }

    const body: TrackVisitorRequest = await req.json();
    const { 
      visitor_id, 
      fingerprint, 
      browser, 
      browser_version, 
      os, 
      device_type, 
      screen_resolution, 
      timezone 
    } = body;

    if (!visitor_id) {
      return new Response(
        JSON.stringify({ error: 'visitor_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if visitor already exists
    const { data: existingVisitor } = await supabase
      .from('anonymous_visitors')
      .select('id')
      .eq('visitor_id', visitor_id)
      .single();

    if (existingVisitor) {
      // Update last_seen_at for returning visitor
      const updateData: Record<string, unknown> = { 
        last_seen_at: new Date().toISOString(),
      };
      if (ipAddress !== 'unknown') updateData.ip_address = ipAddress;
      if (country) updateData.country = country;
      if (city) updateData.city = city;

      const { error: updateError } = await supabase
        .from('anonymous_visitors')
        .update(updateData)
        .eq('visitor_id', visitor_id);

      if (updateError) {
        console.error('Error updating visitor:', updateError);
      }

      console.log('Updated returning visitor:', visitor_id);
    } else {
      // Insert new visitor
      const { error: insertError } = await supabase
        .from('anonymous_visitors')
        .insert({
          visitor_id,
          fingerprint,
          ip_address: ipAddress !== 'unknown' ? ipAddress : null,
          country,
          city,
          browser,
          browser_version,
          os,
          device_type,
          screen_resolution,
          timezone
        });

      if (insertError) {
        console.error('Error inserting visitor:', insertError);
        throw insertError;
      }

      console.log('Inserted new visitor:', visitor_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ip_address: ipAddress !== 'unknown' ? ipAddress : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Track visitor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
