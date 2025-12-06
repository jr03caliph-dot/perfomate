-- Migration: Add prayer field to attendance and attendance_archive tables
-- This adds support for prayer-based attendance tracking

-- Add prayer column to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS prayer text CHECK (prayer IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'));

-- Add prayer column to attendance_archive table
ALTER TABLE attendance_archive 
ADD COLUMN IF NOT EXISTS prayer text CHECK (prayer IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'));

-- Add index for performance on prayer field
CREATE INDEX IF NOT EXISTS idx_attendance_prayer ON attendance(prayer);
CREATE INDEX IF NOT EXISTS idx_attendance_archive_prayer ON attendance_archive(prayer);

