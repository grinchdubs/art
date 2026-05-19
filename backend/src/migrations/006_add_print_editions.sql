-- Migration 006: Per-copy Print Edition Tracking
-- Date: 2026-05-18
-- Purpose: Track each individual copy of a limited edition (status, owner, sale link)
--          including variant labels (regular, AP, PP, HC).

CREATE TABLE IF NOT EXISTS print_editions (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  edition_type VARCHAR(20) NOT NULL DEFAULT 'regular',  -- 'regular' | 'AP' | 'PP' | 'HC'
  copy_number INTEGER NOT NULL,                          -- 1..N within (work, edition_type)
  status VARCHAR(20) NOT NULL DEFAULT 'available',       -- 'available' | 'reserved' | 'sold' | 'destroyed' | 'archived'
  owner_name VARCHAR(255),
  sale_id INTEGER,
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT print_editions_work_xor CHECK (
    (artwork_id IS NOT NULL AND digital_work_id IS NULL) OR
    (artwork_id IS NULL AND digital_work_id IS NOT NULL)
  ),
  CONSTRAINT print_editions_type_ck CHECK (edition_type IN ('regular','AP','PP','HC')),
  CONSTRAINT print_editions_status_ck CHECK (status IN ('available','reserved','sold','destroyed','archived'))
);

-- One copy_number per (work, edition_type) — enforced as partial unique indexes
-- so the XOR between artwork_id and digital_work_id stays clean.
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_editions_artwork_uniq
  ON print_editions (artwork_id, edition_type, copy_number)
  WHERE artwork_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_editions_digital_uniq
  ON print_editions (digital_work_id, edition_type, copy_number)
  WHERE digital_work_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_print_editions_status ON print_editions(status);
CREATE INDEX IF NOT EXISTS idx_print_editions_sale ON print_editions(sale_id);

-- Sales link back to a specific copy (nullable for unique/non-editioned works
-- and for legacy sales).
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS edition_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_sales_edition ON sales(edition_id);

-- FK from sales.edition_id → print_editions.id, added only if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_edition_id_fkey' AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_edition_id_fkey
      FOREIGN KEY (edition_id) REFERENCES print_editions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- print_editions.sale_id ↔ sales.id (deferred so a sale can be created and the
-- copy updated in either order). Added only if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'print_editions_sale_id_fkey' AND table_name = 'print_editions'
  ) THEN
    ALTER TABLE print_editions
      ADD CONSTRAINT print_editions_sale_id_fkey
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TRIGGER update_print_editions_updated_at
  BEFORE UPDATE ON print_editions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE print_editions IS 'One row per individual copy of a limited edition. Tracks per-copy status, owner, and sale linkage.';
COMMENT ON COLUMN print_editions.edition_type IS 'regular = numbered, AP = artist proof, PP = printer proof, HC = hors commerce';
COMMENT ON COLUMN print_editions.copy_number IS 'Sequential number within (work, edition_type). For regulars: 1..edition_total.';
