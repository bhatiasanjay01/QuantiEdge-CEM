/*
  # Add Missing Columns to Email Campaigns Table

  ## Changes
  This migration adds missing columns to the email_campaigns table that are needed
  for campaign tracking and analytics.

  ## New Columns
  - `type` (text) - Campaign type: 'one-off' or 'sequence'
  - `recipients_count` (integer) - Total number of recipients
  - `sent_count` (integer) - Number of emails successfully sent
  - `open_rate` (decimal) - Percentage of emails opened
  - `click_rate` (decimal) - Percentage of links clicked

  ## Important Notes
  - Uses IF NOT EXISTS pattern to prevent errors if columns already exist
  - Sets default values for existing records
*/

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE email_campaigns 
    ADD COLUMN type text NOT NULL DEFAULT 'one-off' 
    CHECK (type IN ('one-off', 'sequence'));
  END IF;
END $$;

-- Add recipients_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'recipients_count'
  ) THEN
    ALTER TABLE email_campaigns 
    ADD COLUMN recipients_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add sent_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'sent_count'
  ) THEN
    ALTER TABLE email_campaigns 
    ADD COLUMN sent_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add open_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'open_rate'
  ) THEN
    ALTER TABLE email_campaigns 
    ADD COLUMN open_rate decimal(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add click_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'click_rate'
  ) THEN
    ALTER TABLE email_campaigns 
    ADD COLUMN click_rate decimal(5,2) DEFAULT 0.00;
  END IF;
END $$;