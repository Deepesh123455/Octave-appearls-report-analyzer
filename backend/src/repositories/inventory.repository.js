import { db } from '../../db/config.js';
import { inventorySnapshots } from '../../db/schema.js';
import { eq, and, sql, asc } from 'drizzle-orm';

/**
 * Repository for Inventory Data
 * Handles database operations using Drizzle ORM
 */
class InventoryRepository {
  /**
   * Upsert inventory data in batches. Implements idempotency using a composite unique constraint.
   * Target: (report_date, location_name, article_no, color_name)
   */
  async upsertInventoryData(dataArray) {
    console.log(`REPOSITORY: Received request to upsert ${dataArray.length} records...`);
    if (!dataArray || dataArray.length === 0) return { success: true, count: 0 };
    
    if (!inventorySnapshots) {
      console.error('CRITICAL ERROR: inventorySnapshots table is undefined in repository');
      throw new Error('Database schema selection failed');
    }
    const BATCH_SIZE = 200;
    let totalCount = 0;
    const defaultDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
      const rawBatch = dataArray.slice(i, i + BATCH_SIZE)
        .filter(row => row.locationName || row.articleNo)
        .map(row => ({
          reportDate: row.reportDate || defaultDate,
          locationName: String(row.locationName || 'UNKNOWN-LOC').substring(0, 255),
          sectionName: row.sectionName ? String(row.sectionName).substring(0, 255) : null,
          subSectionName: row.subSectionName ? String(row.subSectionName).substring(0, 255) : null,
          category: row.category ? String(row.category).substring(0, 255) : 'General',
          articleNo: String(row.articleNo || 'GENERAL-STOCK').substring(0, 100),
          colorName: String(row.colorName || 'N/A').substring(0, 100),
          fabric: row.fabric ? String(row.fabric).substring(0, 100) : null,
          obsQty: Number(row.obsQty || 0),
          cbsQty: Number(row.cbsQty || 0),
          gitQty: Number(row.gitQty || 0),
          netSlsQty: Number(row.netSlsQty || 0),
          saleThruPct: Number(row.saleThruPercent || row.saleThruPct || 0)
        }))
        // Filter out rows where articleNo is just a category keyword (Mapping artifact)
        .filter(row => {
          const art = row.articleNo.toUpperCase();
          return !['MEN', 'WOMEN', 'KIDS', 'ACCESSORIES', 'TOTAL', 'GRAND TOTAL'].includes(art);
        });

      // Drizzle/Postgres Safeguard: Deduplicate rows WITHIN the same batch for (Date, Store, SKU, Color)
      // because UPSERT cannot handle duplicates in the primary key in a single statement.
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
              saleThruPct: sql`EXCLUDED.sale_thru_pct`
            }
          });
        
        totalCount += batch.length;
        if (totalCount % 1000 === 0) {
           console.log(`REPOSITORY: Progress - ${totalCount} records ingested`);
        }
      } catch (err) {
        console.error('DATABASE INGESTION ERROR:', {
          message: err.message,
          code: err.code,
          detail: err.detail,
          batchSize: batch.length
        });
        throw err;
      }
    }

    return { success: true, count: totalCount };
  }

  /**
   * Retrieve inventory data based on filters.
   * Returns data in camelCase format exactly like the old local array.
   * @param {Object} filters - Optional filters (locationName, sectionName, etc.)
   */
  async getInventoryDataForProcessing(filters = {}) {
    const query = db.select().from(inventorySnapshots);
    
    const conditions = [];
    if (filters.locationName) conditions.push(eq(inventorySnapshots.locationName, filters.locationName));
    if (filters.sectionName) conditions.push(eq(inventorySnapshots.sectionName, filters.sectionName));
    if (filters.reportDate) conditions.push(eq(inventorySnapshots.reportDate, filters.reportDate));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const results = await query;
    return results;
  }

  /**
   * Keep existing logs contract but using memory for now as it wasn't specified to move to DB
   * In a real app, these should also be in a DB table.
   */
  constructor() {
    this.uploadLogs = [];
  }

  async logUpload(fileName, recordCount) {
    const entry = {
      fileName,
      timestamp: new Date().toISOString(),
      totalRecords: recordCount
    };
    this.uploadLogs.push(entry);
    return entry;
  }

  async getLogs() {
    return this.uploadLogs;
  }

  // Backward compatibility for existing services
  async bulkInsert(rows) {
     return this.upsertInventoryData(rows);
  }

  async getAll() {
    return this.getInventoryDataForProcessing();
  }

  /**
   * Get all unique article numbers (SKUs) from the DB, sorted alphabetically.
   * Returns an array of strings.
   */
  async getUniqueSKUs() {
    const result = await db
      .selectDistinct({ articleNo: inventorySnapshots.articleNo })
      .from(inventorySnapshots)
      .orderBy(asc(inventorySnapshots.articleNo));
    return result.map(r => r.articleNo).filter(s => s && s !== 'N/A');
  }

  /**
   * Get all rows for a specific SKU (articleNo), across all stores.
   * Aggregates per (locationName, sectionName) to reduce row count.
   */
  async getSKUDetail(articleNo) {
    const result = await db
      .select({
        locationName:  inventorySnapshots.locationName,
        sectionName:   inventorySnapshots.sectionName,
        colorName:     inventorySnapshots.colorName,
        obsQty:        sql`SUM(${inventorySnapshots.obsQty})`.as('obsQty'),
        cbsQty:        sql`SUM(${inventorySnapshots.cbsQty})`.as('cbsQty'),
        gitQty:        sql`SUM(${inventorySnapshots.gitQty})`.as('gitQty'),
        netSlsQty:     sql`SUM(${inventorySnapshots.netSlsQty})`.as('netSlsQty'),
        saleThruPct:   sql`AVG(${inventorySnapshots.saleThruPct})`.as('saleThruPct'),
      })
      .from(inventorySnapshots)
      .where(eq(inventorySnapshots.articleNo, articleNo))
      .groupBy(inventorySnapshots.locationName, inventorySnapshots.sectionName, inventorySnapshots.colorName)
      .orderBy(asc(inventorySnapshots.locationName));
    return result;
  }
}

export default new InventoryRepository();

