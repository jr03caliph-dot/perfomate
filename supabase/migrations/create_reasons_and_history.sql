-- Create class_reasons table
CREATE TABLE IF NOT EXISTS class_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reason text NOT NULL UNIQUE,
  tally integer NOT NULL DEFAULT 1 CHECK (tally > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create performance_reasons table
CREATE TABLE IF NOT EXISTS performance_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reason text NOT NULL UNIQUE,
  tally integer NOT NULL DEFAULT 1 CHECK (tally > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tally_history table to track all actions
CREATE TABLE IF NOT EXISTS tally_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class text NOT NULL,
  mentor_id uuid REFERENCES mentors(id),
  mentor_short_form text NOT NULL,
  type text NOT NULL CHECK (type IN ('class', 'star', 'performance')),
  reason text,
  tally_value integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_reasons_reason ON class_reasons(reason);
CREATE INDEX IF NOT EXISTS idx_performance_reasons_reason ON performance_reasons(reason);
CREATE INDEX IF NOT EXISTS idx_tally_history_student_id ON tally_history(student_id);
CREATE INDEX IF NOT EXISTS idx_tally_history_class ON tally_history(class);
CREATE INDEX IF NOT EXISTS idx_tally_history_mentor_id ON tally_history(mentor_id);
CREATE INDEX IF NOT EXISTS idx_tally_history_type ON tally_history(type);
CREATE INDEX IF NOT EXISTS idx_tally_history_created_at ON tally_history(created_at);

-- Enable Row Level Security
ALTER TABLE class_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_history ENABLE ROW LEVEL SECURITY;

-- Create policies for class_reasons
CREATE POLICY "Enable read access for all authenticated users" ON class_reasons
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON class_reasons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON class_reasons
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all authenticated users" ON class_reasons
  FOR DELETE USING (true);

-- Create policies for performance_reasons
CREATE POLICY "Enable read access for all authenticated users" ON performance_reasons
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON performance_reasons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON performance_reasons
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all authenticated users" ON performance_reasons
  FOR DELETE USING (true);

-- Create policies for tally_history
CREATE POLICY "Enable read access for all authenticated users" ON tally_history
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON tally_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for all authenticated users" ON tally_history
  FOR DELETE USING (true);

