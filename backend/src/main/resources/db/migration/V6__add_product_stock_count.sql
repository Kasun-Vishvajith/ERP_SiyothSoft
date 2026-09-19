ALTER TABLE products ADD COLUMN stock_count integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0);
