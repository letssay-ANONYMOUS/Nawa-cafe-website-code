import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const checkAuth = async (req: Request): Promise<boolean> => {
  const token = req.headers.get('x-admin-token');
  const sessionSecret = Deno.env.get('SESSION_SECRET');
  
  if (!sessionSecret || !token || !token.includes(':')) return false;

  try {
    const [timestampStr, signatureBase64] = token.split(':');
    const timestamp = parseInt(timestampStr, 10);
    
    // Check if session is expired (8 hours)
    const now = Date.now();
    const maxAge = 8 * 60 * 60 * 1000;
    
    if (now - timestamp > maxAge) return false;

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`admin:${timestamp}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, signatureBytes, data);
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!(await checkAuth(req))) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileName, contentType } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'File name required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating upload path for:', fileName);

    // Generate a unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = fileName.split('.').pop();
    const path = `${timestamp}-${randomString}.${extension}`;

    console.log('Upload path generated:', path);

    return new Response(
      JSON.stringify({ 
        path,
        contentType: contentType || 'application/octet-stream'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
