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

async function sendEmailViaSMTP(
  from: string,
  to: string,
  subject: string,
  body: string,
  password: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    const conn = await Deno.connect({
      hostname: 'smtp.gmail.com',
      port: 587,
    });

    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    await conn.read(buffer);

    await conn.write(encoder.encode('EHLO localhost\r\n'));
    await conn.read(buffer);

    await conn.write(encoder.encode('STARTTLS\r\n'));
    await conn.read(buffer);

    const tlsConn = await Deno.startTls(conn, { hostname: 'smtp.gmail.com' });

    await tlsConn.write(encoder.encode('EHLO localhost\r\n'));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode('AUTH LOGIN\r\n'));
    await tlsConn.read(buffer);

    const emailB64 = btoa(from);
    await tlsConn.write(encoder.encode(`${emailB64}\r\n`));
    await tlsConn.read(buffer);

    const passwordB64 = btoa(password);
    await tlsConn.write(encoder.encode(`${passwordB64}\r\n`));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode(`MAIL FROM:<${from}>\r\n`));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode(`RCPT TO:<${to}>\r\n`));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode('DATA\r\n'));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode(`${message}\r\n.\r\n`));
    await tlsConn.read(buffer);

    await tlsConn.write(encoder.encode('QUIT\r\n'));
    await tlsConn.read(buffer);

    tlsConn.close();
    return true;
  } catch (error) {
    console.error('SMTP Error:', error);
    return false;
  }
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
    const senderEmail = 'bhatia.pradyprady28@gmail.com';
    const senderPassword = 'uyuskmxteayngsnt';

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
      user_id: user.id,
    }));

    const { error: recipientsError } = await supabase
      .from('campaign_recipients')
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

          const success = await sendEmailViaSMTP(
            senderEmail,
            recipient.email,
            subject,
            personalizedContent,
            senderPassword
          );

          if (success) {
            successCount++;
            await supabase
              .from('campaign_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('campaign_id', campaign.id)
              .eq('customer_email', recipient.email);
          } else {
            failedCount++;
            await supabase
              .from('campaign_recipients')
              .update({
                status: 'failed',
                error_message: 'Failed to send email',
              })
              .eq('campaign_id', campaign.id)
              .eq('customer_email', recipient.email);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failedCount++;
          await supabase
            .from('campaign_recipients')
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
