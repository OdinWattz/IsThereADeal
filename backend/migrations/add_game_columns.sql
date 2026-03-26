-- Add missing columns to games table
-- Run this SQL script on your production database (Supabase/Vercel Postgres)

ALTER TABLE games
ADD COLUMN IF NOT EXISTS historic_low_price FLOAT,
ADD COLUMN IF NOT EXISTS historic_low_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS metacritic_score INTEGER,
ADD COLUMN IF NOT EXISTS steam_review_score INTEGER,
ADD COLUMN IF NOT EXISTS steam_review_count INTEGER,
ADD COLUMN IF NOT EXISTS player_count_current INTEGER,
ADD COLUMN IF NOT EXISTS player_count_peak INTEGER;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;
