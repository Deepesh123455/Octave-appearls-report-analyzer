import inventoryRepository from '../repositories/inventory.repository.js';
import { InventoryConfig } from '../config/inventory.config.js';

const { THRESHOLDS, TRANSFER } = InventoryConfig;

/**
 * Classify stock status for a single store-SKU row.
 * Returns one or more status strings (a row can be BOTH in-transit AND critical).
 * @param {object} row – { obsQty, cbsQty, gitQty, netSlsQty, saleThruPct }
 * @returns {{ primary: string, inTransit: boolean }}
 */
export const classifyStatus = (row) => {
  const { cbsQty = 0, gitQty = 0, netSlsQty = 0, saleThruPct = 0 } = row;
  const stockOnHand = cbsQty;
  const sales = netSlsQty;
  const velocity = sales;
  const inTransit = gitQty > 0;

  // 1. OUT OF STOCK
  if (stockOnHand <= 0 && velocity > 0) {
    return { primary: 'OUT_OF_STOCK', inTransit };
  }

  // 2. STAGNANT
  if (velocity <= 0 && stockOnHand > 0) {
    return { primary: 'STAGNANT', inTransit };
  }

  // 3. WOS CALCULATION (Velocity detected)
  if (velocity >= THRESHOLDS.MIN_SALES_FOR_WOS) {
    const wos = stockOnHand / velocity;
    if (wos < THRESHOLDS.WOS_CRITICAL) return { primary: 'CRITICAL', inTransit };
    if (wos < THRESHOLDS.WOS_LOW) return { primary: 'LOW_STOCK', inTransit };
    if (wos > THRESHOLDS.WOS_OVERSTOCK) return { primary: 'OVERSTOCK', inTransit };
  }

  // 4. FALLBACKS
  if (saleThruPct > THRESHOLDS.STATIC_SELL_THRU_HIGH && stockOnHand < THRESHOLDS.CRITICAL_CBS) {
    return { primary: 'CRITICAL', inTransit };
  }

  if (saleThruPct < THRESHOLDS.STATIC_SELL_THRU_LOW && stockOnHand > (THRESHOLDS.CRITICAL_CBS * 4)) {
    return { primary: 'OVERSTOCK', inTransit };
  }

  return { primary: 'HEALTHY', inTransit };
};

class SKUService {
  /**
   * Return a sorted list of all unique article numbers in the DB.
   */
  async getSKUList() {
    return inventoryRepository.getUniqueSKUs();
  }

  /**
   * Return full analytics for a single SKU, broken down by store.
   */
  async getSKUDetail(articleNo) {
    const rows = await inventoryRepository.getSKUDetail(articleNo);
    if (!rows || rows.length === 0) return null;

    // Aggregate totals across all stores
    let totalObs = 0, totalCbs = 0, totalGit = 0, totalSales = 0, saleThruSum = 0;

    const storeBreakdown = rows.map(row => {
      const obsQty = Number(row.obsQty || 0);
      const cbsQty = Number(row.cbsQty || 0);
      const gitQty = Number(row.gitQty || 0);
      const netSlsQty = Number(row.netSlsQty || 0);
      const saleThruPct = Number(row.saleThruPct || 0);

      totalObs += obsQty;
      totalCbs += cbsQty;
      totalGit += gitQty;
      totalSales += netSlsQty;
      saleThruSum += saleThruPct;

      const { primary, inTransit } = classifyStatus({ obsQty, cbsQty, gitQty, netSlsQty, saleThruPct });

      return {
        locationName: row.locationName,
        sectionName: row.sectionName,
        colorName: row.colorName,
        obsQty,
        cbsQty,
        gitQty,
        netSlsQty,
        saleThruPct,
        status: primary,
        inTransit,
      };
    });

    const avgSaleThru = rows.length > 0 ? saleThruSum / rows.length : 0;
    const { primary: overallStatus } = classifyStatus({
      obsQty: totalObs,
      cbsQty: totalCbs,
      gitQty: totalGit,
      netSlsQty: totalSales,
      saleThruPct: avgSaleThru,
    });

    return {
      articleNo,
      summary: {
        totalObs,
        totalCbs,
        totalGit,
        totalSales,
        avgSaleThru: Math.round(avgSaleThru * 10) / 10,
        overallStatus,
        inTransit: totalGit > 0,
        storeCount: rows.length,
      },
      storeBreakdown,
    };
  }

  /**
   * Find cross-store transfer opportunities for all SKUs using the enterprise logic.
   * Optimizes performance by fetching all data for the latest date in a single query.
   */
  async getTransferSuggestions() {
    // 1. Fetch ALL data for the latest snapshot in one go
    const latestData = await inventoryRepository.getInventoryDataForProcessing();
    if (!latestData || latestData.length === 0) return [];

    // 2. Group by Article Number
    const skuMap = {};
    for (const row of latestData) {
      const art = String(row.articleNo || '').trim();
      if (!art || art === 'N/A') continue;
      if (!skuMap[art]) skuMap[art] = [];
      skuMap[art].push(row);
    }

    // 3. Process each SKU using the unified matching engine
    let allSuggestions = [];
    for (const [articleNo, rows] of Object.entries(skuMap)) {
      if (rows.length < 2) continue;
      const suggestions = this.computeEnterpriseMatches(articleNo, rows);
      allSuggestions = allSuggestions.concat(suggestions);
    }

    // 4. Sort and limit
    return allSuggestions
      .sort((a, b) => b.transferQty - a.transferQty)
      .slice(0, TRANSFER.MAX_SUGGESTIONS);
  }

  /**
   * Generate stock transfer recommendations for a specific SKU based on exact enterprise logic.
   * This is the "dynamic" real-time calculation requested.
   */
  async getSKUTransferRecommendations(articleNo) {
    const rows = await inventoryRepository.getSKUDetail(articleNo);
    if (!rows || rows.length < 2) return [];

    return this.computeEnterpriseMatches(articleNo, rows);
  }

  /**
   * Unified Matching Engine implementing the exact enterprise prioritisation logic.
   * Shared by both global and per-SKU calculation methods.
   */
  computeEnterpriseMatches(articleNo, rows) {
    // Constants for enterprise logic
    const DESIRED_STOCK_LEVEL = 8;
    const SAFETY_STOCK = 5;
    const RECEIVER_CBS_THRESHOLD = 5;
    const DONOR_CBS_THRESHOLD = 8;
    const HIGH_SALES_THRESHOLD = 10;

    // 1. Identify Receivers (Deficit Stores)
    const receivers = rows
      .map(row => {
        const cbsQty = Number(row.cbsQty || 0);
        const gitQty = Number(row.gitQty || 0);
        const netSlsQty = Number(row.netSlsQty || 0);
        const saleThruPct = Number(row.saleThruPct || row.saleThruPercent || 0);

        // Dynamic Demand: High if any sales exist, or good sell-thru
        const wos = netSlsQty > 0 ? cbsQty / netSlsQty : Infinity;
        const isHighDemand = (saleThruPct >= 20) || (netSlsQty > 0);
        const isLowStock = wos < 4 || cbsQty <= 3;

        if (isHighDemand && isLowStock) {
          // Dynamic Desired Stock: Target 4 weeks of coverage, bounded 5 to 15
          let targetStock = Math.max(5, Math.min(15, netSlsQty * 4));
          // Boost target for hot items
          if (saleThruPct >= 50) targetStock = Math.max(8, targetStock);

          const trueDeficit = targetStock - (cbsQty + gitQty);
          if (trueDeficit > 0) {
            return { ...row, trueDeficit };
          }
        }
        return null;
      })
      .filter(Boolean);

    // 2. Identify Donors (Surplus Stores)
    const donors = rows
      .map(row => {
        const cbsQty = Number(row.cbsQty || 0);
        const netSlsQty = Number(row.netSlsQty || 0);
        const saleThruPct = Number(row.saleThruPct || row.saleThruPercent || 0);

        // Dynamic Supply: Donor if high WOS (>6 weeks), very low sales, or poor sell-thru
        const wos = netSlsQty > 0 ? cbsQty / netSlsQty : Infinity;
        const isLowDemand = (wos > 6) || (netSlsQty <= 2) || (saleThruPct < 15);
        const isHighStock = cbsQty > 3; // Lower barrier to entry for donation

        if (isLowDemand && isHighStock) {
          // Dynamic Safety Stock: Retain 2 weeks of sales or minimum 3
          const safetyStock = Math.max(3, netSlsQty * 2);
          const availableToTransfer = cbsQty - safetyStock;

          if (availableToTransfer > 0) {
            return { ...row, availableToTransfer };
          }
        }
        return null;
      })
      .filter(Boolean);

    if (receivers.length === 0 || donors.length === 0) return [];

    const recommendations = [];

    // 3. Matching Engine (Priority Routing)
    const donorPool = donors.map(d => ({ ...d }));

    for (const receiver of receivers) {
      let deficitToFill = receiver.trueDeficit;

      // Priority 1: Intra-Region (Same ASM)
      for (const donor of donorPool) {
        if (deficitToFill <= 0) break;
        if (donor.availableToTransfer <= 0) continue;
        if (donor.locationName === receiver.locationName) continue;
        if (donor.articleNo !== receiver.articleNo) continue; // Safety check
        if (donor.colorName !== receiver.colorName) continue;
        if (donor.asm !== receiver.asm) continue;

        const transferQty = Math.min(deficitToFill, donor.availableToTransfer);
        if (transferQty >= 3) {
          recommendations.push({
            fromStore: donor.locationName,
            toStore: receiver.locationName,
            articleNo,
            colorName: receiver.colorName,
            category: receiver.category || donor.category || 'N/A',
            recommendedQty: transferQty,
            toCbs: receiver.cbsQty,
            urgency: receiver.cbsQty < 3 ? 'HIGH' : receiver.trueDeficit > 10 ? 'MEDIUM' : 'LOW',
            isSameAsm: true,
            fromAsm: donor.asm,
            toAsm: receiver.asm
          });
          donor.availableToTransfer -= transferQty;
          deficitToFill -= transferQty;
        }
      }

      // Priority 2: Inter-Region (Different ASM)
      for (const donor of donorPool) {
        if (deficitToFill <= 0) break;
        if (donor.availableToTransfer <= 0) continue;
        if (donor.locationName === receiver.locationName) continue;
        if (donor.colorName !== receiver.colorName) continue;
        if (donor.asm === receiver.asm) continue;

        const transferQty = Math.min(deficitToFill, donor.availableToTransfer);
        if (transferQty >= 3) {
          recommendations.push({
            fromStore: donor.locationName,
            toStore: receiver.locationName,
            articleNo,
            colorName: receiver.colorName,
            category: receiver.category || donor.category || 'N/A',
            recommendedQty: transferQty,
            toCbs: receiver.cbsQty,
            urgency: receiver.cbsQty < 3 ? 'HIGH' : receiver.trueDeficit > 10 ? 'MEDIUM' : 'LOW',
            isSameAsm: false,
            fromAsm: donor.asm,
            toAsm: receiver.asm
          });
          donor.availableToTransfer -= transferQty;
          deficitToFill -= transferQty;
        }
      }
    }

    return recommendations;
  }
}

export default new SKUService();
