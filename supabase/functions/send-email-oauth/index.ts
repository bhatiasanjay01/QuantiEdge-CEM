import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  provider?: 'google' | 'microsoft';
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

    const emailData: EmailRequest = await req.json();
    const { to, subject, body, provider = 'google' } = emailData;

    const { data: credentials, error: credError } = await supabase
      .from('user_oauth_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: `No ${provider} credentials found. Please connect your account first.` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (provider === 'google') {
      const response = await sendViaGmail(
        credentials.access_token,
        credentials.email,
        to,
        subject,
        body
      );
      return new Response(
        JSON.stringify({ success: true, messageId: response }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (provider === 'microsoft') {
      const response = await sendViaOutlook(
        credentials.access_token,
        to,
        subject,
        body
      );
      return new Response(
        JSON.stringify({ success: true, messageId: response }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Unsupported provider');
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

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  const encodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.id;
}

async function sendViaOutlook(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Microsoft Graph API error: ${JSON.stringify(error)}`);
  }

  return 'sent';
}
