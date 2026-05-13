import { db } from '../../db/config.js';
import { inventorySnapshots } from '../../db/schema.js';
import { eq, and, sql, asc } from 'drizzle-orm';

class InventoryRepository {
  constructor() {
    this.uploadLogs = [];
  }

  // ── Upsert ───────────────────────────────────────────────────────────────

  async upsertInventoryData(dataArray) {
    console.log(`REPOSITORY: Upserting ${dataArray.length} records...`);
    if (!dataArray || dataArray.length === 0) return { success: true, count: 0 };

    const BATCH_SIZE = 200;
    let totalCount = 0;
    const defaultDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
      const rawBatch = dataArray.slice(i, i + BATCH_SIZE)
        .filter(row => row.locationName || row.articleNo)
        .map(row => ({
          reportDate: row.reportDate || defaultDate,
          // Identity
          locationName: String(row.locationName || 'UNKNOWN-LOC').substring(0, 255),
          sectionName: row.sectionName ? String(row.sectionName).substring(0, 255) : null,
          subSectionName: row.subSectionName ? String(row.subSectionName).substring(0, 255) : null,
          category: row.category ? String(row.category).substring(0, 255) : 'General',
          articleNo: String(row.articleNo || 'GENERAL-STOCK').substring(0, 100),
          colorName: String(row.colorName || 'N/A').substring(0, 100),
          // Product attributes
          fabric: row.fabric ? String(row.fabric).substring(0, 100) : null,
          description: row.description ? String(row.description).substring(0, 500) : null,
          brand: row.brand ? String(row.brand).substring(0, 100) : null,
          gender: row.gender ? String(row.gender).substring(0, 20) : null,
          season: row.season ? String(row.season).substring(0, 50) : null,
          styleCode: row.styleCode ? String(row.styleCode).substring(0, 100) : null,
          size: row.size ? String(row.size).substring(0, 50) : null,
          barcode: row.barcode ? String(row.barcode).substring(0, 50) : null,
          // Core quantities
          obsQty: Number(row.obsQty || 0),
          cbsQty: Number(row.cbsQty || 0),
          gitQty: Number(row.gitQty || 0),
          netSlsQty: Number(row.netSlsQty || 0),
          saleThruPct: Number(row.saleThruPct || row.saleThruPercent || 0),
          // Extended quantities
          groupPurQty: Number(row.groupPurQty || 0),
          groupPrtQty: Number(row.groupPrtQty || 0),
          deliveryChallanQty: Number(row.deliveryChallanQty || 0),
          groupWslQty: Number(row.groupWslQty || 0),
          returnQty: Number(row.returnQty || 0),
          transferInQty: Number(row.transferInQty || 0),
          transferOutQty: Number(row.transferOutQty || 0),
          damagedQty: Number(row.damagedQty || 0),
          // Financial
          mrp: row.mrp != null ? Number(row.mrp) : null,
          asp: row.asp != null ? Number(row.asp) : null,
          netSalesValue: row.netSalesValue != null ? Number(row.netSalesValue) : null,
          discountPct: Number(row.discountPct || 0),
          costPrice: row.costPrice != null ? Number(row.costPrice) : null,
          // Organization
          asm: row.asm ? String(row.asm).substring(0, 255) : null,
          region: row.region ? String(row.region).substring(0, 100) : null,
          zone: row.zone ? String(row.zone).substring(0, 100) : null,
          storeGrade: row.storeGrade ? String(row.storeGrade).substring(0, 10) : null,
          storeManager: row.storeManager ? String(row.storeManager).substring(0, 255) : null,
          // Time
          weekNumber: row.weekNumber != null ? Number(row.weekNumber) : null,
          periodLabel: row.periodLabel ? String(row.periodLabel).substring(0, 50) : null,
          daysInPeriod: row.daysInPeriod != null ? Number(row.daysInPeriod) : 30,
        }))
        .filter(row => {
          const art = row.articleNo.toUpperCase();
          return !['MEN', 'WOMEN', 'KIDS', 'ACCESSORIES', 'TOTAL', 'GRAND TOTAL'].includes(art);
        });

      // Deduplicate within batch
      const uniqueMap = new Map();
      rawBatch.forEach(row => {
        const key = `${row.reportDate}|${row.locationName}|${row.articleNo}|${row.colorName}`;
        uniqueMap.set(key, row);
      });
      const batch = Array.from(uniqueMap.values());
      if (batch.length === 0) continue;

      try {
        await db.insert(inventorySnapshots)
          .values(batch)
          .onConflictDoUpdate({
            target: [
              inventorySnapshots.reportDate,
              inventorySnapshots.locationName,
              inventorySnapshots.articleNo,
              inventorySnapshots.colorName
            ],
            set: {
              cbsQty: sql`EXCLUDED.cbs_qty`,
              gitQty: sql`EXCLUDED.git_qty`,
              netSlsQty: sql`EXCLUDED.net_sls_qty`,
              saleThruPct: sql`EXCLUDED.sale_thru_pct`,
              groupPurQty: sql`EXCLUDED.group_pur_qty`,
              groupPrtQty: sql`EXCLUDED.group_prt_qty`,
              deliveryChallanQty: sql`EXCLUDED.delivery_challan_qty`,
              groupWslQty: sql`EXCLUDED.group_wsl_qty`,
              returnQty: sql`EXCLUDED.return_qty`,
              transferInQty: sql`EXCLUDED.transfer_in_qty`,
              transferOutQty: sql`EXCLUDED.transfer_out_qty`,
              damagedQty: sql`EXCLUDED.damaged_qty`,
              mrp: sql`EXCLUDED.mrp`,
              asp: sql`EXCLUDED.asp`,
              netSalesValue: sql`EXCLUDED.net_sales_value`,
              discountPct: sql`EXCLUDED.discount_pct`,
              costPrice: sql`EXCLUDED.cost_price`,
              description: sql`EXCLUDED.description`,
              fabric: sql`EXCLUDED.fabric`,
              brand: sql`EXCLUDED.brand`,
              gender: sql`EXCLUDED.gender`,
              season: sql`EXCLUDED.season`,
              region: sql`EXCLUDED.region`,
              zone: sql`EXCLUDED.zone`,
              asm: sql`EXCLUDED.asm`,
            }
          });

        totalCount += batch.length;
        if (totalCount % 1000 === 0) console.log(`REPOSITORY: ${totalCount} records ingested`);
      } catch (err) {
        console.error('DATABASE INGESTION ERROR:', { message: err.message, code: err.code, detail: err.detail });
        throw err;
      }
    }

    return { success: true, count: totalCount };
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  async getLatestReportDate() {
    const result = await db
      .select({ maxDate: sql`MAX(${inventorySnapshots.reportDate})` })
      .from(inventorySnapshots);
    return result[0]?.maxDate || null;
  }

  async getInventoryDataForProcessing(filters = {}) {
    const latestDate = filters.reportDate || await this.getLatestReportDate();
    const query = db.select().from(inventorySnapshots);
    const conditions = [];
    if (latestDate) conditions.push(eq(inventorySnapshots.reportDate, latestDate));
    if (filters.locationName) conditions.push(eq(inventorySnapshots.locationName, filters.locationName));
    if (filters.sectionName) conditions.push(eq(inventorySnapshots.sectionName, filters.sectionName));
    if (conditions.length > 0) query.where(and(...conditions));
    return await query;
  }

  async getUniqueSKUs() {
    const result = await db
      .selectDistinct({ articleNo: inventorySnapshots.articleNo })
      .from(inventorySnapshots)
      .orderBy(asc(inventorySnapshots.articleNo));
    return result.map(r => r.articleNo).filter(s => s && s !== 'N/A');
  }

  async getSKUDetail(articleNo, reportDate = null) {
    const targetDate = reportDate || await this.getLatestReportDate();

    return await db
      .select({
        locationName: inventorySnapshots.locationName,
        sectionName: inventorySnapshots.sectionName,
        subSectionName: inventorySnapshots.subSectionName,
        category: inventorySnapshots.category,
        colorName: inventorySnapshots.colorName,
        description: inventorySnapshots.description,
        fabric: inventorySnapshots.fabric,
        brand: inventorySnapshots.brand,
        gender: inventorySnapshots.gender,
        season: inventorySnapshots.season,
        styleCode: inventorySnapshots.styleCode,
        size: inventorySnapshots.size,
        region: inventorySnapshots.region,
        zone: inventorySnapshots.zone,
        storeGrade: inventorySnapshots.storeGrade,
        asm: inventorySnapshots.asm,
        // Aggregated quantities
        obsQty: sql`SUM(${inventorySnapshots.obsQty})`.as('obsQty'),
        cbsQty: sql`SUM(${inventorySnapshots.cbsQty})`.as('cbsQty'),
        gitQty: sql`SUM(${inventorySnapshots.gitQty})`.as('gitQty'),
        netSlsQty: sql`SUM(${inventorySnapshots.netSlsQty})`.as('netSlsQty'),
        saleThruPct: sql`AVG(${inventorySnapshots.saleThruPct})`.as('saleThruPct'),
        groupPurQty: sql`SUM(${inventorySnapshots.groupPurQty})`.as('groupPurQty'),
        groupPrtQty: sql`SUM(${inventorySnapshots.groupPrtQty})`.as('groupPrtQty'),
        deliveryChallanQty: sql`SUM(${inventorySnapshots.deliveryChallanQty})`.as('deliveryChallanQty'),
        groupWslQty: sql`SUM(${inventorySnapshots.groupWslQty})`.as('groupWslQty'),
        returnQty: sql`SUM(${inventorySnapshots.returnQty})`.as('returnQty'),
        transferInQty: sql`SUM(${inventorySnapshots.transferInQty})`.as('transferInQty'),
        transferOutQty: sql`SUM(${inventorySnapshots.transferOutQty})`.as('transferOutQty'),
        damagedQty: sql`SUM(${inventorySnapshots.damagedQty})`.as('damagedQty'),
        mrp: sql`AVG(${inventorySnapshots.mrp})`.as('mrp'),
        asp: sql`AVG(${inventorySnapshots.asp})`.as('asp'),
        netSalesValue: sql`SUM(${inventorySnapshots.netSalesValue})`.as('netSalesValue'),
        discountPct: sql`AVG(${inventorySnapshots.discountPct})`.as('discountPct'),
        costPrice: sql`AVG(${inventorySnapshots.costPrice})`.as('costPrice'),
      })
      .from(inventorySnapshots)
      .where(and(
        eq(inventorySnapshots.articleNo, articleNo),
        targetDate ? eq(inventorySnapshots.reportDate, targetDate) : sql`TRUE`
      ))
      .groupBy(
        inventorySnapshots.locationName, inventorySnapshots.sectionName,
        inventorySnapshots.subSectionName, inventorySnapshots.category,
        inventorySnapshots.colorName, inventorySnapshots.description,
        inventorySnapshots.fabric, inventorySnapshots.brand,
        inventorySnapshots.gender, inventorySnapshots.season,
        inventorySnapshots.styleCode, inventorySnapshots.size,
        inventorySnapshots.region, inventorySnapshots.zone,
        inventorySnapshots.storeGrade, inventorySnapshots.asm
      )
      .orderBy(asc(inventorySnapshots.locationName));
  }

  // ── Backward-compat ───────────────────────────────────────────────────────
  async bulkInsert(rows) { return this.upsertInventoryData(rows); }
  async getAll() { return this.getInventoryDataForProcessing(); }

  async logUpload(fileName, recordCount) {
    const entry = { fileName, timestamp: new Date().toISOString(), totalRecords: recordCount };
    this.uploadLogs.push(entry);
    return entry;
  }
  async getLogs() { return this.uploadLogs; }
}

export default new InventoryRepository();
