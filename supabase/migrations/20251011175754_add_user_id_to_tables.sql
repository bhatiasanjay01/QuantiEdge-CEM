/*
  # Add user_id to existing tables

  1. Changes
    - Add `user_id` column to `email_campaigns` table
    - Add `user_id` column to `contact_lists` table
    - Add `user_id` column to `contacts` table
    - Update RLS policies to use user_id for access control

  2. Security
    - Update RLS policies to ensure users can only access their own data
*/

-- Add user_id columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_email_campaigns_user_id ON email_campaigns(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contact_lists ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_contact_lists_user_id ON contact_lists(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_contacts_user_id ON contacts(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_recipients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE campaign_recipients ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_campaign_recipients_user_id ON campaign_recipients(user_id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON email_campaigns;

DROP POLICY IF EXISTS "Users can read own lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON contact_lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON contact_lists;

DROP POLICY IF EXISTS "Users can read own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

DROP POLICY IF EXISTS "Users can read own recipients" ON campaign_recipients;
DROP POLICY IF EXISTS "Users can insert own recipients" ON campaign_recipients;
DROP POLICY IF EXISTS "Users can update own recipients" ON campaign_recipients;

-- Create new policies for email_campaigns
CREATE POLICY "Users can read own campaigns"
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

-- Create new policies for contact_lists
CREATE POLICY "Users can read own lists"
  ON contact_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON contact_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON contact_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON contact_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new policies for contacts
CREATE POLICY "Users can read own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new policies for campaign_recipients
CREATE POLICY "Users can read own recipients"
  ON campaign_recipients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipients"
  ON campaign_recipients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipients"
  ON campaign_recipients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
