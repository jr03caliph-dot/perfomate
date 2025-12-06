-- Migration: Create voice_of_director table for Director messages
-- Allows admins to post messages visible to all mentors on the dashboard

-- Create voice_of_director table
CREATE TABLE IF NOT EXISTS voice_of_director (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_voice_of_director_created_at ON voice_of_director(created_at DESC);

-- Enable Row Level Security
ALTER TABLE voice_of_director ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for authenticated users
CREATE POLICY "Authenticated users can read all director messages"
  ON voice_of_director FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert director messages"
  ON voice_of_director FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update director messages"
  ON voice_of_director FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete director messages"
  ON voice_of_director FOR DELETE
  TO authenticated
  USING (true);

