-- Add stars column to morning_bliss table
ALTER TABLE morning_bliss 
ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN morning_bliss.stars IS 'Stars awarded based on score: 9.0=1, 9.5=2, 10.0=3';

