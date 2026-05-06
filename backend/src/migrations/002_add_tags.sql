-- Tags System Migration
-- Run this in PostgreSQL to add tags functionality

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3498db',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create artwork_tags junction table
CREATE TABLE IF NOT EXISTS artwork_tags (
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (artwork_id, tag_id)
);

-- Create digital_work_tags junction table
CREATE TABLE IF NOT EXISTS digital_work_tags (
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (digital_work_id, tag_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_artwork_tags_artwork ON artwork_tags(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_tags_tag ON artwork_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_digital_work_tags_work ON digital_work_tags(digital_work_id);
CREATE INDEX IF NOT EXISTS idx_digital_work_tags_tag ON digital_work_tags(tag_id);

-- Insert some default tags (optional)
INSERT INTO tags (name, color) VALUES 
  ('Generative Art', '#9b59b6'),
  ('NFT', '#e74c3c'),
  ('Series', '#3498db'),
  ('Featured', '#f39c12'),
  ('Archive', '#95a5a6')
ON CONFLICT (name) DO NOTHING;
