-- Create star_reasons table for manual star reasons
CREATE TABLE IF NOT EXISTS star_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reason text NOT NULL UNIQUE,
  stars integer NOT NULL DEFAULT 1 CHECK (stars > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_star_reasons_reason ON star_reasons(reason);

ALTER TABLE star_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON star_reasons
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all authenticated users" ON star_reasons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all authenticated users" ON star_reasons
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all authenticated users" ON star_reasons
  FOR DELETE USING (true);


