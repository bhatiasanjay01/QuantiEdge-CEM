import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OAuthCallbackRequest {
  code: string;
  redirect_uri: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

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
      throw new Error('Not authenticated');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with the user's token for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (path === 'initiate') {
      const clientId = Deno.env.get('GMAIL_CLIENT_ID');
      const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/settings`;
      
      if (!clientId) {
        throw new Error('Gmail OAuth not configured. Please set GMAIL_CLIENT_ID environment variable.');
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${user.id}`;

      return new Response(
        JSON.stringify({ authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (path === 'callback' && req.method === 'POST') {
      const { code, redirect_uri } = await req.json() as OAuthCallbackRequest;
      
      const clientId = Deno.env.get('GMAIL_CLIENT_ID');
      const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('Gmail OAuth credentials not configured');
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await tokenResponse.json() as TokenResponse;

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();
      const email = userInfo.email;

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      const { data: existingAccount } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', email)
        .maybeSingle();

      if (existingAccount) {
        const { error: updateError } = await supabase
          .from('email_accounts')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: expiryDate.toISOString(),
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAccount.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('email_accounts')
          .insert({
            user_id: user.id,
            email,
            provider: 'gmail',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: expiryDate.toISOString(),
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, email }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (path === 'disconnect' && req.method === 'POST') {
      const { error } = await supabase
        .from('email_accounts')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid endpoint');

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
