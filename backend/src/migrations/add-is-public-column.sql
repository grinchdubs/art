-- Add is_public column to artworks table
ALTER TABLE artworks 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add is_public column to digital_works table
ALTER TABLE digital_works 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Set all existing works to public by default
UPDATE artworks SET is_public = true WHERE is_public IS NULL;
UPDATE digital_works SET is_public = true WHERE is_public IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN artworks.is_public IS 'Whether this artwork is visible in the public gallery';
COMMENT ON COLUMN digital_works.is_public IS 'Whether this digital work is visible in the public gallery';
