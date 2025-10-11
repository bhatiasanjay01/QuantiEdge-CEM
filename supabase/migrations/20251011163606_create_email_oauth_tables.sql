/*
  # Email OAuth and Campaign Management Schema

  ## New Tables
  
  ### `email_accounts`
  Stores OAuth credentials for connected email accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `email` (text) - The connected Gmail address
  - `provider` (text) - OAuth provider (gmail)
  - `access_token` (text) - Encrypted OAuth access token
  - `refresh_token` (text) - Encrypted OAuth refresh token
  - `token_expiry` (timestamptz) - When the access token expires
  - `is_active` (boolean) - Whether this account is active
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `email_campaigns`
  Stores email campaign data
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text) - Campaign name
  - `subject` (text) - Email subject
  - `content` (text) - Email body
  - `status` (text) - draft, scheduled, sending, sent, failed
  - `scheduled_at` (timestamptz) - When to send (null for immediate)
  - `sent_at` (timestamptz) - When it was actually sent
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `email_recipients`
  Tracks recipients for each campaign
  - `id` (uuid, primary key)
  - `campaign_id` (uuid, references email_campaigns)
  - `customer_email` (text)
  - `customer_name` (text)
  - `status` (text) - pending, sent, failed, bounced
  - `sent_at` (timestamptz)
  - `error_message` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Proper policies for authenticated users
*/

-- Create email_accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  provider text NOT NULL DEFAULT 'gmail',
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email accounts"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts"
  ON email_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts"
  ON email_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts"
  ON email_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON email_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON email_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON email_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON email_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create email_recipients table
CREATE TABLE IF NOT EXISTS email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipients of own campaigns"
  ON email_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_campaigns
      WHERE email_campaigns.id = email_recipients.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipients for own campaigns"
  ON email_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_campaigns
      WHERE email_campaigns.id = email_recipients.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipients of own campaigns"
  ON email_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_campaigns
      WHERE email_campaigns.id = email_recipients.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_campaigns
      WHERE email_campaigns.id = email_recipients.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_is_active ON email_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_recipients(status);
