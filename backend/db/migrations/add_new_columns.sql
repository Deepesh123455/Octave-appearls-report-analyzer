-- ============================================================
-- MIGRATION: Add all new columns to inventory_snapshots
-- Run this in your Supabase SQL Editor
-- All columns use IF NOT EXISTS — safe to re-run
-- ============================================================

-- Product Attributes
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS description  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS brand        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gender       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS season       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS style_code   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS barcode      VARCHAR(50);

-- Extended Quantity Fields
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS group_pur_qty        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_prt_qty        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_challan_qty  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_wsl_qty        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_qty           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_in_qty      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_out_qty     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damaged_qty          INTEGER DEFAULT 0;

-- Financial Fields
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS mrp             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS asp             NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS net_sales_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS discount_pct    REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price      NUMERIC(12,2);

-- Organization Fields
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS region        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS zone          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS store_grade   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS store_manager VARCHAR(255);

-- Time / Period Fields
ALTER TABLE public.inventory_snapshots
  ADD COLUMN IF NOT EXISTS week_number    INTEGER,
  ADD COLUMN IF NOT EXISTS period_label   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS days_in_period INTEGER DEFAULT 30;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS location_idx  ON public.inventory_snapshots USING btree (location_name);
CREATE INDEX IF NOT EXISTS brand_idx     ON public.inventory_snapshots USING btree (brand);
CREATE INDEX IF NOT EXISTS region_idx    ON public.inventory_snapshots USING btree (region);
CREATE INDEX IF NOT EXISTS season_idx    ON public.inventory_snapshots USING btree (season);
CREATE INDEX IF NOT EXISTS category_idx  ON public.inventory_snapshots USING btree (category);
