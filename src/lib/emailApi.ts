import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface SendEmailParams {
  campaignName: string;
  subject: string;
  content: string;
  recipients: EmailRecipient[];
  scheduledAt?: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  is_active: boolean;
  created_at: string;
}

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

export async function initiateGmailOAuth(redirectUri: string): Promise<string> {
  const token = await getAuthToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/gmail-oauth/initiate?redirect_uri=${encodeURIComponent(redirectUri)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to initiate OAuth');
  }

  const data = await response.json();
  return data.authUrl;
}

export async function completeGmailOAuth(code: string, redirectUri: string): Promise<{ success: boolean; email: string }> {
  const token = await getAuthToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/gmail-oauth/callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete OAuth');
  }

  return await response.json();
}

export async function disconnectGmail(): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/gmail-oauth/disconnect`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Gmail');
  }
}

export async function getConnectedEmailAccount(): Promise<EmailAccount | null> {
  const { data, error } = await supabase
    .from('email_accounts')
    .select('id, email, provider, is_active, created_at')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; campaignId: string; successCount?: number; failedCount?: number; message: string }> {
  const token = await getAuthToken();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return await response.json();
}
