import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendEmailRequest {
  campaignName: string;
  subject: string;
  content: string;
  recipients: Array<{
    email: string;
    name: string;
  }>;
  scheduledAt?: string;
}

interface EmailAccount {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return await response.json();
}

function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string
): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendGmailMessage(
  accessToken: string,
  rawMessage: string
): Promise<boolean> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawMessage }),
  });

  return response.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    if (req.method !== 'POST') {
      throw new Error('Only POST method is allowed');
    }

    const { campaignName, subject, content, recipients, scheduledAt } = await req.json() as SendEmailRequest;

    if (!subject || !content || !recipients || recipients.length === 0) {
      throw new Error('Missing required fields');
    }

    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle() as { data: EmailAccount | null; error: any };

    if (accountError || !emailAccount) {
      throw new Error('No active email account found. Please connect your Gmail account first.');
    }

    let accessToken = emailAccount.access_token;
    const tokenExpiry = new Date(emailAccount.token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      const clientId = Deno.env.get('GMAIL_CLIENT_ID')!;
      const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')!;
      
      const newTokens = await refreshAccessToken(
        emailAccount.refresh_token,
        clientId,
        clientSecret
      );

      accessToken = newTokens.access_token;
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + newTokens.expires_in);

      await supabase
        .from('email_accounts')
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', emailAccount.id);
    }

    const status = scheduledAt ? 'scheduled' : 'sending';
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: user.id,
        name: campaignName,
        subject,
        content,
        status,
        scheduled_at: scheduledAt || null,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      throw new Error('Failed to create campaign');
    }

    const recipientRecords = recipients.map(r => ({
      campaign_id: campaign.id,
      customer_email: r.email,
      customer_name: r.name,
      status: scheduledAt ? 'pending' : 'pending',
    }));

    const { error: recipientsError } = await supabase
      .from('email_recipients')
      .insert(recipientRecords);

    if (recipientsError) {
      throw new Error('Failed to add recipients');
    }

    if (!scheduledAt) {
      let successCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          const personalizedContent = content
            .replace(/{{firstName}}/g, recipient.name.split(' ')[0])
            .replace(/{{lastName}}/g, recipient.name.split(' ').slice(1).join(' '))
            .replace(/{{email}}/g, recipient.email);

          const mimeMessage = createMimeMessage(
            emailAccount.email,
            recipient.email,
            subject,
            personalizedContent
          );

          const success = await sendGmailMessage(accessToken, mimeMessage);

          if (success) {
            successCount++;
            await supabase
              .from('email_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('campaign_id', campaign.id)
              .eq('customer_email', recipient.email);
          } else {
            failedCount++;
            await supabase
              .from('email_recipients')
              .update({
                status: 'failed',
                error_message: 'Failed to send email',
              })
              .eq('campaign_id', campaign.id)
              .eq('customer_email', recipient.email);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failedCount++;
          await supabase
            .from('email_recipients')
            .update({
              status: 'failed',
              error_message: error.message,
            })
            .eq('campaign_id', campaign.id)
            .eq('customer_email', recipient.email);
        }
      }

      const finalStatus = failedCount === 0 ? 'sent' : failedCount < recipients.length ? 'sent' : 'failed';
      await supabase
        .from('email_campaigns')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          successCount,
          failedCount,
          message: `Sent ${successCount} emails successfully, ${failedCount} failed`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          message: `Email campaign scheduled for ${scheduledAt}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

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