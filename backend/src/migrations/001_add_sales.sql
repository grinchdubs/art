-- Migration 001: Sales tracking table
-- Backfill: the sales table was added ad-hoc on prod and never captured as a
-- migration. This file documents the canonical schema so fresh DBs bootstrap
-- correctly. Idempotent — existing prod/dev DBs already have the table.

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
  digital_work_id INTEGER REFERENCES digital_works(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  sale_price DECIMAL(10,2),
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  platform VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_work_xor CHECK (
    (artwork_id IS NOT NULL AND digital_work_id IS NULL) OR
    (artwork_id IS NULL AND digital_work_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_artwork ON sales(artwork_id);
CREATE INDEX IF NOT EXISTS idx_sales_digital_work ON sales(digital_work_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_updated_at') THEN
    CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
