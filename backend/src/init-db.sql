-- Art Catalog Database Schema

-- Physical Artworks
CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  inventory_number VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  creation_date VARCHAR(100),
  medium TEXT,
  dimensions VARCHAR(255),
  series_name VARCHAR(255),
  sale_status VARCHAR(50) DEFAULT 'available',
  price VARCHAR(100),
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Digital Works
CREATE TABLE IF NOT EXISTS digital_works (
  id SERIAL PRIMARY KEY,
  inventory_number VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  creation_date VARCHAR(100),
  file_format VARCHAR(100),
  file_size VARCHAR(100),
  dimensions VARCHAR(255),
  sale_status VARCHAR(50) DEFAULT 'available',
  price VARCHAR(100),
  license_type VARCHAR(255),
  video_url TEXT,
  embed_url TEXT,
  platform VARCHAR(100),
  nft_token_id VARCHAR(255),
  nft_contract_address VARCHAR(255),
  nft_blockchain VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exhibitions
CREATE TABLE IF NOT EXISTS exhibitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  venue VARCHAR(500),
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Global Image Gallery
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  mime_type VARCHAR(100),
  file_size INTEGER,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artwork - Image relationships
CREATE TABLE IF NOT EXISTS artwork_images (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  image_id INTEGER REFERENCES gallery_images(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(artwork_id, image_id)
);

-- Digital Work - Image relationships
CREATE TABLE IF NOT EXISTS digital_work_images (
  id SERIAL PRIMARY KEY,
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  image_id INTEGER REFERENCES gallery_images(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(digital_work_id, image_id)
);

-- Artwork - Exhibition relationships
CREATE TABLE IF NOT EXISTS artwork_exhibitions (
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
  PRIMARY KEY (artwork_id, exhibition_id)
);

-- Digital Work - Exhibition relationships
CREATE TABLE IF NOT EXISTS digital_work_exhibitions (
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
  PRIMARY KEY (digital_work_id, exhibition_id)
);

-- Location History for physical artworks
CREATE TABLE IF NOT EXISTS location_history (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL,
  moved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_artworks_inventory ON artworks(inventory_number);
CREATE INDEX IF NOT EXISTS idx_artworks_title ON artworks(title);
CREATE INDEX IF NOT EXISTS idx_digital_works_inventory ON digital_works(inventory_number);
CREATE INDEX IF NOT EXISTS idx_digital_works_title ON digital_works(title);
CREATE INDEX IF NOT EXISTS idx_exhibitions_name ON exhibitions(name);
CREATE INDEX IF NOT EXISTS idx_gallery_images_filename ON gallery_images(filename);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artworks_updated_at BEFORE UPDATE ON artworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_works_updated_at BEFORE UPDATE ON digital_works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exhibitions_updated_at BEFORE UPDATE ON exhibitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
