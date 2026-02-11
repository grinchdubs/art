-- Migration 003: Add Provenance & Ownership Tracking
-- Date: 2026-02-10
-- Purpose: Track ownership history and transfers for artworks and digital works

-- Create ownership_history table to track all transfers
CREATE TABLE IF NOT EXISTS ownership_history (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  transfer_type VARCHAR(50) NOT NULL, -- 'sale', 'gift', 'loan', 'consignment', 'return', 'artist_retained'
  transfer_date DATE NOT NULL,
  owner_name VARCHAR(255),
  owner_email VARCHAR(255),
  owner_phone VARCHAR(100),
  price_paid DECIMAL(10,2),
  payment_method VARCHAR(100), -- 'cash', 'check', 'wire', 'paypal', 'crypto', 'trade', 'other'
  return_date DATE, -- For loans/consignments - when expected back
  contract_url TEXT, -- Link to signed contract/agreement document
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_artwork_or_digital CHECK (
    (artwork_id IS NOT NULL AND digital_work_id IS NULL) OR
    (artwork_id IS NULL AND digital_work_id IS NOT NULL)
  )
);

-- Add current owner fields to artworks table
ALTER TABLE artworks 
  ADD COLUMN IF NOT EXISTS current_owner VARCHAR(255),
  ADD COLUMN IF NOT EXISTS acquisition_date DATE;

-- Add current owner fields to digital_works table
ALTER TABLE digital_works 
  ADD COLUMN IF NOT EXISTS current_owner VARCHAR(255),
  ADD COLUMN IF NOT EXISTS acquisition_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ownership_artwork ON ownership_history(artwork_id);
CREATE INDEX IF NOT EXISTS idx_ownership_digital ON ownership_history(digital_work_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_date ON ownership_history(transfer_date);
CREATE INDEX IF NOT EXISTS idx_ownership_owner_name ON ownership_history(owner_name);

-- Add update trigger for ownership_history
CREATE TRIGGER update_ownership_history_updated_at 
  BEFORE UPDATE ON ownership_history
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE ownership_history IS 'Tracks complete provenance and ownership transfers for artworks and digital works';
COMMENT ON COLUMN ownership_history.transfer_type IS 'Type of transfer: sale, gift, loan, consignment, return, artist_retained';
COMMENT ON COLUMN ownership_history.return_date IS 'Expected return date for loans and consignments';
COMMENT ON COLUMN artworks.current_owner IS 'Current owner or location if not with artist';
COMMENT ON COLUMN artworks.acquisition_date IS 'Date when current owner acquired the work';
