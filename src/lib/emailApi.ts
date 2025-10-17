const PYTHON_SERVER_URL = 'http://localhost:5000';

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
  is_connected: boolean;
  email: string | null;
}

export async function initiateGmailOAuth(): Promise<void> {
  window.location.href = `${PYTHON_SERVER_URL}/api/auth/google`;
}

export async function getConnectedEmailAccount(): Promise<EmailAccount> {
  const response = await fetch(`${PYTHON_SERVER_URL}/api/auth/status`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to get auth status');
  }

  return await response.json();
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; successCount?: number; failedCount?: number; message: string }> {
  const recipientEmails = params.recipients.map(r => r.email);

  const url = params.scheduledAt
    ? `${PYTHON_SERVER_URL}/api/schedule-email`
    : `${PYTHON_SERVER_URL}/api/send-email`;

  const body = params.scheduledAt
    ? {
        to: recipientEmails,
        subject: params.subject,
        body: params.content,
        send_at: params.scheduledAt,
      }
    : {
        to: recipientEmails,
        subject: params.subject,
        body: params.content,
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error('Gmail account not connected. Please connect in Settings.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  const result = await response.json();

  return {
    success: true,
    successCount: result.success_count,
    failedCount: result.failed_count,
    message: result.message || 'Email sent successfully',
  };
}
