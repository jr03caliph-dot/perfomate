/*
  # Performate - School Performance and Attendance Tracker

  ## Overview
  This migration creates the complete database schema for Performate, a real-time school 
  performance and attendance tracking system for mentors.

  ## 1. New Tables
  
  ### `mentors`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `email` (text, unique) - Mentor's email for authentication
  - `full_name` (text) - Mentor's full name
  - `short_form` (text) - Short form (e.g., "SJ" for Safa Javid)
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### `students`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `name` (text) - Student's full name
  - `roll_number` (text) - Student's roll number
  - `class` (text) - Class name (JCP3, S2A, S2B, C2A, C2B, S1A, S1B, C1A, C1B, C1C)
  - `photo_url` (text, optional) - URL to student's photo in storage
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `tallies`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid, foreign key) - References students table
  - `count` (integer) - Number of tallies (default 0)
  - `fine_amount` (numeric) - Calculated fine (count × ₹10)
  - `added_by` (uuid, foreign key) - References mentors table
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `stars`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid, foreign key) - References students table
  - `count` (integer) - Number of stars (default 0)
  - `added_by` (uuid, foreign key) - References mentors table
  - `source` (text) - Source of star (manual, morning_bliss)
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `other_tallies`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid, foreign key) - References students table
  - `count` (integer) - Number of other tallies (default 0)
  - `fine_amount` (numeric) - Calculated fine (count × ₹10)
  - `added_by` (uuid, foreign key) - References mentors table
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `morning_bliss`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid, foreign key) - References students table
  - `class` (text) - Student's class
  - `topic` (text) - Topic presented
  - `score` (numeric) - Score from 0-10 (decimal supported)
  - `evaluated_by` (text) - Mentor's short form
  - `evaluator_id` (uuid, foreign key) - References mentors table
  - `photo_urls` (text[]) - Array of photo URLs
  - `date` (date) - Date of evaluation
  - `is_daily_winner` (boolean) - Daily winner flag
  - `is_topper` (boolean) - Topper flag (score ≥9.5)
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `attendance`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid, foreign key) - References students table
  - `class` (text) - Student's class
  - `date` (date) - Attendance date
  - `status` (text) - Status (Present, Absent, Hospital, Program, Reported)
  - `reason` (text, optional) - Optional reason for absence
  - `marked_by` (uuid, foreign key) - References mentors table
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `attendance_archive`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `student_id` (uuid) - Student identifier
  - `class` (text) - Student's class
  - `date` (date) - Attendance date
  - `status` (text) - Attendance status
  - `reason` (text, optional) - Optional reason
  - `marked_by` (uuid) - Mentor identifier
  - `archived_at` (timestamptz) - Archive timestamp
  - `original_month` (text) - Original month (YYYY-MM format)

  ## 2. Storage Buckets
  - `student-photos` - For student profile photos
  - `morning-bliss-photos` - For Morning Bliss presentation photos

  ## 3. Security
  All tables have Row Level Security (RLS) enabled with permissive policies that allow:
  - All authenticated users to read all data
  - All authenticated users to insert/update/delete data
  
  This ensures mentors can access and modify all records without permission errors while
  maintaining authentication requirements.

  ## 4. Indexes
  Created indexes on frequently queried columns for optimal performance:
  - student_id foreign keys
  - class fields
  - date fields
  - evaluator/marker foreign keys

  ## 5. Important Notes
  - All timestamps use timestamptz for proper timezone handling
  - Fine amounts auto-calculate based on tally counts (₹10 per tally)
  - Stars reduce tallies (1 Star = -2 Tallies) via application logic
  - Other Tallies are not reduced by Stars
  - Morning Bliss auto-awards stars for scores ≥9 (1 star) and ≥9.5 (2 stars)
  - Once entries are added, they are locked (no editing via UI)
  - Attendance archive preserves historical data for reports after monthly resets
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create mentors table
CREATE TABLE IF NOT EXISTS mentors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  short_form text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  roll_number text NOT NULL,
  class text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(roll_number, class)
);

-- Create tallies table
CREATE TABLE IF NOT EXISTS tallies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  count integer DEFAULT 0,
  fine_amount numeric DEFAULT 0,
  added_by uuid REFERENCES mentors(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stars table
CREATE TABLE IF NOT EXISTS stars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  count integer DEFAULT 0,
  added_by uuid REFERENCES mentors(id),
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Create other_tallies table
CREATE TABLE IF NOT EXISTS other_tallies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  count integer DEFAULT 0,
  fine_amount numeric DEFAULT 0,
  added_by uuid REFERENCES mentors(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create morning_bliss table
CREATE TABLE IF NOT EXISTS morning_bliss (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class text NOT NULL,
  topic text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 10),
  evaluated_by text NOT NULL,
  evaluator_id uuid REFERENCES mentors(id),
  photo_urls text[] DEFAULT '{}',
  date date DEFAULT CURRENT_DATE,
  is_daily_winner boolean DEFAULT false,
  is_topper boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('Present', 'Absent', 'Hospital', 'Program', 'Reported')),
  reason text,
  marked_by uuid REFERENCES mentors(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create attendance_archive table
CREATE TABLE IF NOT EXISTS attendance_archive (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  class text NOT NULL,
  date date NOT NULL,
  status text NOT NULL,
  reason text,
  marked_by uuid,
  archived_at timestamptz DEFAULT now(),
  original_month text NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tallies_student_id ON tallies(student_id);
CREATE INDEX IF NOT EXISTS idx_stars_student_id ON stars(student_id);
CREATE INDEX IF NOT EXISTS idx_other_tallies_student_id ON other_tallies(student_id);
CREATE INDEX IF NOT EXISTS idx_morning_bliss_student_id ON morning_bliss(student_id);
CREATE INDEX IF NOT EXISTS idx_morning_bliss_date ON morning_bliss(date);
CREATE INDEX IF NOT EXISTS idx_morning_bliss_class ON morning_bliss(class);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);

-- Enable Row Level Security on all tables
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_tallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE morning_bliss ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_archive ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for authenticated users
-- Mentors table policies
CREATE POLICY "Authenticated users can read all mentors"
  ON mentors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mentors"
  ON mentors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentors"
  ON mentors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Students table policies
CREATE POLICY "Authenticated users can read all students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- Tallies table policies
CREATE POLICY "Authenticated users can read all tallies"
  ON tallies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tallies"
  ON tallies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tallies"
  ON tallies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tallies"
  ON tallies FOR DELETE
  TO authenticated
  USING (true);

-- Stars table policies
CREATE POLICY "Authenticated users can read all stars"
  ON stars FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stars"
  ON stars FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stars"
  ON stars FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stars"
  ON stars FOR DELETE
  TO authenticated
  USING (true);

-- Other tallies table policies
CREATE POLICY "Authenticated users can read all other_tallies"
  ON other_tallies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert other_tallies"
  ON other_tallies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update other_tallies"
  ON other_tallies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete other_tallies"
  ON other_tallies FOR DELETE
  TO authenticated
  USING (true);

-- Morning bliss table policies
CREATE POLICY "Authenticated users can read all morning_bliss"
  ON morning_bliss FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert morning_bliss"
  ON morning_bliss FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update morning_bliss"
  ON morning_bliss FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete morning_bliss"
  ON morning_bliss FOR DELETE
  TO authenticated
  USING (true);

-- Attendance table policies
CREATE POLICY "Authenticated users can read all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (true);

-- Attendance archive table policies
CREATE POLICY "Authenticated users can read all attendance_archive"
  ON attendance_archive FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendance_archive"
  ON attendance_archive FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance_archive"
  ON attendance_archive FOR DELETE
  TO authenticated
  USING (true);