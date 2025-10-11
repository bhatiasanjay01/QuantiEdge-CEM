# OAuth Setup Guide

This application now supports Gmail and Outlook OAuth authentication, allowing users to send emails directly from their own email accounts.

## Features

- Sign in with Google (Gmail)
- Sign in with Microsoft (Outlook)
- Secure token storage in Supabase
- Send emails using user's OAuth credentials
- Personalized email campaigns

## Configuration Required

To enable OAuth functionality, you need to configure OAuth providers in your Supabase project:

### 1. Google OAuth (Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret
7. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Paste Client ID and Client Secret
   - Add scope: `https://www.googleapis.com/auth/gmail.send`

### 2. Microsoft OAuth (Outlook)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration
4. Add redirect URI:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Go to "API permissions" and add:
   - Mail.Send
   - offline_access
6. Go to "Certificates & secrets" and create a client secret
7. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Azure (Microsoft) provider
   - Paste Application (client) ID and Client Secret

## How It Works

1. **User Authentication**: Users can sign in using their Google or Microsoft accounts
2. **Token Storage**: OAuth tokens are securely stored in the `user_oauth_credentials` table
3. **Email Sending**: When sending emails, the app uses the user's OAuth tokens to send via Gmail or Outlook APIs
4. **Personalization**: Emails can be personalized with customer data using template variables

## Usage

1. Click "Sign in with Google" or "Sign in with Microsoft" on the login page
2. Authorize the application to send emails on your behalf
3. Navigate to Email Campaigns
4. Compose your email
5. Select recipients
6. Click "Send Now" - emails will be sent from your connected account

## Security

- All OAuth tokens are stored encrypted in Supabase
- Row Level Security (RLS) ensures users can only access their own credentials
- Tokens are passed securely to Edge Functions for sending emails
- No passwords are stored - only OAuth tokens

## Technical Details

### Database Tables

- `user_oauth_credentials`: Stores OAuth tokens per user/provider
- `email_campaigns`: Campaign data linked to authenticated users
- `contacts`: Contact lists with user isolation
- `campaign_recipients`: Tracks email delivery status

### Edge Functions

- `send-email-oauth`: Sends emails using stored OAuth tokens
- `oauth-callback`: Saves OAuth tokens after successful authentication

### Frontend Components

- Login page with OAuth buttons
- EmailComposer with real email sending
- AuthContext with OAuth state management
