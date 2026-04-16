import { pgTable, serial, varchar, date, integer, real, unique } from 'drizzle-orm/pg-core';

export const inventorySnapshots = pgTable('inventory_snapshots', {
  id: serial('id').primaryKey(),
  reportDate: date('report_date').notNull(),
  locationName: varchar('location_name', { length: 255 }).notNull(),
  sectionName: varchar('section_name', { length: 255 }),
  subSectionName: varchar('sub_section_name', { length: 255 }),
  category: varchar('category', { length: 255 }),
  articleNo: varchar('article_no', { length: 100 }).notNull(),
  colorName: varchar('color_name', { length: 100 }).notNull(),
  fabric: varchar('fabric', { length: 100 }),
  obsQty: integer('obs_qty').default(0),
  cbsQty: integer('cbs_qty').default(0),
  gitQty: integer('git_qty').default(0),
  netSlsQty: integer('net_sls_qty').default(0),
  saleThruPct: real('sale_thru_pct').default(0),
}, (t) => ({
  unq: unique('inventory_snapshots_unique_idx').on(t.reportDate, t.locationName, t.articleNo, t.colorName)
}));
