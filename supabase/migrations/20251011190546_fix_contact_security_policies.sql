/*
  # Fix Security Policies for Contact Management Tables

  ## Changes
  This migration replaces overly permissive public access policies with proper
  user-based security policies for contact_lists and contacts tables.

  ## Security Updates
  1. Drop all public access policies
  2. Add proper authenticated user policies with user_id checks
  3. Ensure data isolation between users

  ## Important Notes
  - Contacts and contact lists are now properly isolated per user
  - Only authenticated users can access their own data
  - Service role can still bypass these policies for system operations
*/

-- Drop existing overly permissive policies for contact_lists
DROP POLICY IF EXISTS "Allow public read access to contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Allow public insert access to contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Allow public update access to contact_lists" ON contact_lists;
DROP POLICY IF EXISTS "Allow public delete access to contact_lists" ON contact_lists;

-- Drop existing overly permissive policies for contacts
DROP POLICY IF EXISTS "Allow public read access to contacts" ON contacts;
DROP POLICY IF EXISTS "Allow public insert access to contacts" ON contacts;
DROP POLICY IF EXISTS "Allow public update access to contacts" ON contacts;
DROP POLICY IF EXISTS "Allow public delete access to contacts" ON contacts;

-- Add user_id column to contact_lists if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contact_lists' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contact_lists 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to contacts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contacts 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create secure policies for contact_lists
CREATE POLICY "Users can view own contact lists"
  ON contact_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact lists"
  ON contact_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact lists"
  ON contact_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact lists"
  ON contact_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create secure policies for contacts
CREATE POLICY "Users can view own contacts"
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