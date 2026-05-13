import { pgTable, serial, varchar, date, integer, real, numeric, unique } from 'drizzle-orm/pg-core';

export const inventorySnapshots = pgTable('inventory_snapshots', {
  id: serial('id').primaryKey(),
  reportDate: date('report_date').notNull(),

  // ── Identity ──────────────────────────────────────────────────────────────
  locationName: varchar('location_name', { length: 255 }).notNull(),
  sectionName: varchar('section_name', { length: 255 }),
  subSectionName: varchar('sub_section_name', { length: 255 }),
  category: varchar('category', { length: 255 }),
  articleNo: varchar('article_no', { length: 100 }).notNull(),
  colorName: varchar('color_name', { length: 100 }).notNull(),

  // ── Product Attributes ────────────────────────────────────────────────────
  fabric: varchar('fabric', { length: 100 }),
  description: varchar('description', { length: 500 }),
  brand: varchar('brand', { length: 100 }),
  gender: varchar('gender', { length: 20 }),
  season: varchar('season', { length: 50 }),
  styleCode: varchar('style_code', { length: 100 }),
  size: varchar('size', { length: 50 }),
  barcode: varchar('barcode', { length: 50 }),

  // ── Core Quantity Fields ──────────────────────────────────────────────────
  obsQty: integer('obs_qty').default(0),
  cbsQty: integer('cbs_qty').default(0),
  gitQty: integer('git_qty').default(0),
  netSlsQty: integer('net_sls_qty').default(0),
  saleThruPct: real('sale_thru_pct').default(0),

  // ── Extended Quantity Fields ──────────────────────────────────────────────
  groupPurQty: integer('group_pur_qty').default(0),
  groupPrtQty: integer('group_prt_qty').default(0),
  deliveryChallanQty: integer('delivery_challan_qty').default(0),
  groupWslQty: integer('group_wsl_qty').default(0),
  returnQty: integer('return_qty').default(0),
  transferInQty: integer('transfer_in_qty').default(0),
  transferOutQty: integer('transfer_out_qty').default(0),
  damagedQty: integer('damaged_qty').default(0),

  // ── Financial Fields ──────────────────────────────────────────────────────
  mrp: numeric('mrp', { precision: 12, scale: 2 }),
  asp: numeric('asp', { precision: 12, scale: 2 }),
  netSalesValue: numeric('net_sales_value', { precision: 14, scale: 2 }),
  discountPct: real('discount_pct').default(0),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),

  // ── Organization ─────────────────────────────────────────────────────────
  asm: varchar('asm', { length: 255 }),
  region: varchar('region', { length: 100 }),
  zone: varchar('zone', { length: 100 }),
  storeGrade: varchar('store_grade', { length: 10 }),
  storeManager: varchar('store_manager', { length: 255 }),

  // ── Time / Period ─────────────────────────────────────────────────────────
  weekNumber: integer('week_number'),
  periodLabel: varchar('period_label', { length: 50 }),
  daysInPeriod: integer('days_in_period').default(30),

}, (t) => ({
  unq: unique('inventory_snapshots_unique_idx').on(t.reportDate, t.locationName, t.articleNo, t.colorName)
}));
