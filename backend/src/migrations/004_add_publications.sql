-- Migration 004: Add Publications & Media Tracking
-- Track where artwork has been published, featured, or mentioned in media

CREATE TABLE IF NOT EXISTS publications (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  publication_type VARCHAR(100) NOT NULL, -- 'magazine', 'blog', 'social_media', 'catalog', 'book', 'website', 'press'
  publication_name VARCHAR(500) NOT NULL,
  publication_date DATE,
  url TEXT,
  page_number VARCHAR(50),
  author VARCHAR(255),
  article_title VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (artwork_id IS NOT NULL AND digital_work_id IS NULL) OR
    (artwork_id IS NULL AND digital_work_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_publications_artwork ON publications(artwork_id);
CREATE INDEX idx_publications_digital ON publications(digital_work_id);
CREATE INDEX idx_publications_date ON publications(publication_date DESC);
CREATE INDEX idx_publications_type ON publications(publication_type);

COMMENT ON TABLE publications IS 'Tracks media appearances, publications, and features of artworks';
COMMENT ON COLUMN publications.publication_type IS 'Type of publication: magazine, blog, social_media, catalog, book, website, press';
COMMENT ON COLUMN publications.url IS 'Direct link to the publication or article';
COMMENT ON COLUMN publications.page_number IS 'Page number or location within publication';
