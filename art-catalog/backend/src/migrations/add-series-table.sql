-- Migration: Add series/collections table
-- This creates a proper series table and migrates existing series_name data

-- Create series table
CREATE TABLE IF NOT EXISTS series (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing series names from artworks to series table
INSERT INTO series (name, created_at)
SELECT DISTINCT series_name, MIN(created_at)
FROM artworks
WHERE series_name IS NOT NULL AND series_name != ''
GROUP BY series_name
ON CONFLICT (name) DO NOTHING;

-- Migrate existing series names from digital_works to series table
INSERT INTO series (name, created_at)
SELECT DISTINCT series_name, MIN(created_at)
FROM digital_works
WHERE series_name IS NOT NULL AND series_name != ''
GROUP BY series_name
ON CONFLICT (name) DO NOTHING;

-- Add series_id foreign key to artworks
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS series_id INTEGER REFERENCES series(id) ON DELETE SET NULL;

-- Add series_id foreign key to digital_works
ALTER TABLE digital_works ADD COLUMN IF NOT EXISTS series_id INTEGER REFERENCES series(id) ON DELETE SET NULL;

-- Update artworks with series_id based on series_name
UPDATE artworks a
SET series_id = s.id
FROM series s
WHERE a.series_name = s.name AND a.series_name IS NOT NULL;

-- Update digital_works with series_id based on series_name
UPDATE digital_works dw
SET series_id = s.id
FROM series s
WHERE dw.series_name = s.name AND dw.series_name IS NOT NULL;

-- Note: We keep series_name columns for now for backward compatibility
-- They can be dropped later after verifying the migration worked correctly
-- ALTER TABLE artworks DROP COLUMN series_name;
-- ALTER TABLE digital_works DROP COLUMN series_name;
