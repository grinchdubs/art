CREATE TABLE IF NOT EXISTS artist_statements (
  id SERIAL PRIMARY KEY,
  version_name VARCHAR(255) NOT NULL,
  statement_text TEXT NOT NULL,
  bio_text TEXT,
  word_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_artist_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_artist_statements_updated_at ON artist_statements;
CREATE TRIGGER update_artist_statements_updated_at
  BEFORE UPDATE ON artist_statements
  FOR EACH ROW EXECUTE PROCEDURE update_artist_statements_updated_at();
