-- Create magazine_scores table
CREATE TABLE IF NOT EXISTS magazine_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0),
  max_score numeric DEFAULT 20 CHECK (max_score > 0),
  date date DEFAULT CURRENT_DATE,
  added_by uuid REFERENCES mentors(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_magazine_scores_student_id ON magazine_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_magazine_scores_date ON magazine_scores(date);
CREATE INDEX IF NOT EXISTS idx_magazine_scores_class ON magazine_scores(class);

-- Enable Row Level Security
ALTER TABLE magazine_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for magazine_scores (same as other tables)
CREATE POLICY "Enable read access for all authenticated users" ON magazine_scores
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON magazine_scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON magazine_scores
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all authenticated users" ON magazine_scores
  FOR DELETE USING (true);

