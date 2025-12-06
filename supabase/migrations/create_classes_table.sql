-- Migration: Create classes table for dynamic class management
-- Allows admins to add/edit/delete classes that appear in all dropdowns

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true -- Soft delete flag
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);

-- Enable Row Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for authenticated users
CREATE POLICY "Authenticated users can read active classes"
  ON classes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all classes"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete classes"
  ON classes FOR DELETE
  TO authenticated
  USING (true);

-- Insert initial classes from hardcoded list
INSERT INTO classes (name, is_active) VALUES
  ('JCP3', true),
  ('S2A', true),
  ('S2B', true),
  ('C2A', true),
  ('C2B', true),
  ('S1A', true),
  ('S1B', true),
  ('C1A', true),
  ('C1B', true),
  ('C1C', true)
ON CONFLICT (name) DO NOTHING;

