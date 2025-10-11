/*
  # Add OAuth Credentials Storage

  1. New Tables
    - `user_oauth_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `provider` (text - 'google' or 'microsoft')
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `token_expires_at` (timestamptz)
      - `email` (text - the email address this credential is for)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_oauth_credentials` table
    - Add policy for users to read their own credentials
    - Add policy for users to insert their own credentials
    - Add policy for users to update their own credentials
    - Add policy for users to delete their own credentials

  3. Notes
    - Tokens will be encrypted at application level before storage
    - User can have multiple OAuth providers connected
    - Each provider/user combination should be unique
*/

CREATE TABLE IF NOT EXISTS user_oauth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, provider)
);

ALTER TABLE user_oauth_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own OAuth credentials"
  ON user_oauth_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth credentials"
  ON user_oauth_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth credentials"
  ON user_oauth_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth credentials"
  ON user_oauth_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_credentials_user_id 
  ON user_oauth_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_credentials_provider 
  ON user_oauth_credentials(provider);
