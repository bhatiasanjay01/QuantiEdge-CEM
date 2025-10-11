/*
  # Create Contact Management Tables

  ## Overview
  This migration creates tables for managing contacts and contact lists for the CRM system.

  ## New Tables

  ### 1. contact_lists
  Manages collections of contacts for targeted campaigns
  - `id` (uuid, primary key) - Unique list identifier
  - `name` (text, required) - List name
  - `description` (text) - Optional list description
  - `contact_count` (integer) - Number of contacts in the list
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. contacts
  Stores individual contact information
  - `id` (uuid, primary key) - Unique contact identifier
  - `list_id` (uuid, foreign key) - References contact_lists(id), nullable
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

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public access policies for development
  - Cascading deletes to maintain referential integrity

  ## Indexes
  - Performance indexes on frequently queried columns
  - Foreign key indexes for efficient joins
*/

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
  list_id uuid REFERENCES contact_lists(id) ON DELETE SET NULL,
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_list_id ON contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_lists_created_at ON contact_lists(created_at DESC);

-- Enable Row Level Security
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (development mode)
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

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_contact_lists_updated_at ON contact_lists;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;

-- Create triggers for updated_at columns
CREATE TRIGGER update_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();