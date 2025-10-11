import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user');
    }

    const { provider_token, provider_refresh_token } = await req.json();

    if (!provider_token) {
      throw new Error('Missing provider token');
    }

    const provider = user.app_metadata.provider || 'google';
    const email = user.email || '';

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error: upsertError } = await supabase
      .from('user_oauth_credentials')
      .upsert({
        user_id: user.id,
        provider: provider === 'google' ? 'google' : 'microsoft',
        access_token: provider_token,
        refresh_token: provider_refresh_token,
        token_expires_at: expiresAt.toISOString(),
        email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OAuth credentials saved' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
