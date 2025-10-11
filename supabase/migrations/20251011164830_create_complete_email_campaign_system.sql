/*
  # Complete Email Campaign System

  ## Overview
  This migration creates a comprehensive email campaign management system with support for:
  - Email campaigns (one-off and sequences)
  - Contact list management
  - Individual contact records
  - Campaign recipients tracking
  - Campaign analytics and metrics

  ## New Tables

  ### 1. email_campaigns
  Stores all email campaign information including content, scheduling, and status
  - `id` (uuid, primary key) - Unique campaign identifier
  - `name` (text, required) - Campaign name for identification
  - `type` (text, required) - Campaign type: 'one-off' or 'sequence'
  - `status` (text, required) - Current status: 'draft', 'scheduled', 'sending', 'sent', 'failed', 'paused'
  - `subject` (text) - Email subject line
  - `content` (text) - Email body content
  - `recipients_count` (integer) - Total number of recipients
  - `sent_count` (integer) - Number of emails successfully sent
  - `open_rate` (decimal) - Percentage of emails opened
  - `click_rate` (decimal) - Percentage of links clicked
  - `scheduled_at` (timestamptz) - When the campaign should be sent
  - `sent_at` (timestamptz) - When the campaign was actually sent
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. contact_lists
  Manages collections of contacts for targeted campaigns
  - `id` (uuid, primary key) - Unique list identifier
  - `name` (text, required) - List name
  - `description` (text) - Optional list description
  - `contact_count` (integer) - Number of contacts in the list
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. contacts
  Stores individual contact information
  - `id` (uuid, primary key) - Unique contact identifier
  - `list_id` (uuid, foreign key) - References contact_lists(id)
  - `first_name` (text, required) - Contact's first name
  - `last_name` (text, required) - Contact's last name
  - `email` (text, required) - Contact's email address
  - `phone` (text) - Optional phone number
  - `company` (text) - Optional company name
  - `job_title` (text) - Optional job title
  - `tags` (text array) - Optional tags for categorization
  - `custom_fields` (jsonb) - Flexible storage for additional data
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. campaign_recipients
  Links campaigns to their recipients and tracks individual email status
  - `id` (uuid, primary key) - Unique record identifier
  - `campaign_id` (uuid, foreign key) - References email_campaigns(id)
  - `contact_id` (uuid, foreign key) - References contacts(id)
  - `email` (text, required) - Recipient email (denormalized for quick access)
  - `status` (text) - Email status: 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  - `sent_at` (timestamptz) - When email was sent
  - `opened_at` (timestamptz) - When email was opened
  - `clicked_at` (timestamptz) - When link was clicked
  - `error_message` (text) - Error details if failed
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access policies for development (should be restricted in production)
  - Cascading deletes to maintain referential integrity

  ## Indexes
  - Performance indexes on frequently queried columns
  - Foreign key indexes for efficient joins
*/

-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'one-off' CHECK (type IN ('one-off', 'sequence')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'paused')),
  subject text,
  content text,
  recipients_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  open_rate decimal(5,2) DEFAULT 0.00,
  click_rate decimal(5,2) DEFAULT 0.00,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contact_lists table
CREATE TABLE IF NOT EXISTS contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES contact_lists(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  job_title text,
  tags text[] DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create campaign_recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON email_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_list_id ON contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);

-- Enable Row Level Security
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (development mode)
-- NOTE: In production, these should be restricted to authenticated users

CREATE POLICY "Allow public read access to email_campaigns"
  ON email_campaigns FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to email_campaigns"
  ON email_campaigns FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to email_campaigns"
  ON email_campaigns FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to email_campaigns"
  ON email_campaigns FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to contact_lists"
  ON contact_lists FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to contact_lists"
  ON contact_lists FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to contact_lists"
  ON contact_lists FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to contact_lists"
  ON contact_lists FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to contacts"
  ON contacts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to contacts"
  ON contacts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to contacts"
  ON contacts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to contacts"
  ON contacts FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to campaign_recipients"
  ON campaign_recipients FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to campaign_recipients"
  ON campaign_recipients FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to campaign_recipients"
  ON campaign_recipients FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to campaign_recipients"
  ON campaign_recipients FOR DELETE
  TO public
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
