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
  const { obsQty = 0, cbsQty = 0, gitQty = 0, netSlsQty = 1, saleThruPct = 0 } = row;
  const inTransit = gitQty > 0;

  let primary;
  // Enterprise-style rule order:
  // 1) Low closing stock => CRITICAL (risk of stockout)
  if (cbsQty < THRESHOLDS.CRITICAL_CBS) {
    primary = 'CRITICAL';
  // 2) Very high sell-through => CRITICAL (fast depletion)
  } else if (saleThruPct > THRESHOLDS.HIGH_SELL_THRU) {
    primary = 'CRITICAL';
  // 3) Very low/zero sell-through while stock exists => OVERSTOCK (slow moving)
  } else if (saleThruPct <= THRESHOLDS.LOW_SELL_THRU && cbsQty >= THRESHOLDS.CRITICAL_CBS) {
    primary = 'OVERSTOCK';
  // 4) Classic overstock by quantity vs sales
  } else if (obsQty > (Math.max(netSlsQty, 1) * THRESHOLDS.OVERSTOCK_RATIO) && obsQty > THRESHOLDS.OVERSTOCK_MIN_QTY) {
    primary = 'OVERSTOCK';
  } else {
    primary = 'HEALTHY';
  }

  return { primary, inTransit };
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
      const obsQty    = Number(row.obsQty    || 0);
      const cbsQty    = Number(row.cbsQty    || 0);
      const gitQty    = Number(row.gitQty    || 0);
      const netSlsQty = Number(row.netSlsQty || 0);
      const saleThruPct = Number(row.saleThruPct || 0);

      totalObs   += obsQty;
      totalCbs   += cbsQty;
      totalGit   += gitQty;
      totalSales += netSlsQty;
      saleThruSum += saleThruPct;

      const { primary, inTransit } = classifyStatus({ obsQty, cbsQty, gitQty, netSlsQty, saleThruPct });

      return {
        locationName: row.locationName,
        sectionName:  row.sectionName,
        colorName:    row.colorName,
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
   * Find cross-store transfer opportunities for all SKUs.
   * Returns an array of transfer suggestions sorted by recommended qty.
   */
  async getTransferSuggestions() {
    // Fetch all data grouped by SKU+location
    const allRows = await inventoryRepository.getAll();
    if (!allRows || allRows.length === 0) return [];

    // Build a map: articleNo → [store rows]
    const skuMap = {};
    for (const row of allRows) {
      const key = String(row.articleNo || '').trim();
      if (!key || key === 'N/A') continue;
      if (!skuMap[key]) skuMap[key] = [];
      skuMap[key].push({
        ...row,
        obsQty:    Number(row.obsQty    || 0),
        cbsQty:    Number(row.cbsQty    || 0),
        gitQty:    Number(row.gitQty    || 0),
        netSlsQty: Number(row.netSlsQty || 0),
      });
    }

    const suggestions = [];

    for (const [articleNo, rows] of Object.entries(skuMap)) {
      if (rows.length < 2) continue;

      // Skip transfer matching if this is consolidated data (labeled NETWORK_WIDE)
      // or if locationName matches articleNo (indicates a mapping failure or total SKU view)
      if (rows.some(r => r.locationName === "NETWORK_WIDE" || r.locationName === articleNo)) continue;

      // 1. Calculate SKU-wide average Stock-on-Hand (SOH) and Sales
      const totalSOH = rows.reduce((acc, r) => acc + r.cbsQty + r.gitQty, 0);
      const totalSales = rows.reduce((acc, r) => acc + r.netSlsQty, 0);
      const avgSOH = totalSOH / rows.length;
      
      // 2. Identify Relative Senders and Receivers
      const senders = [];
      const receivers = [];

      for (const row of rows) {
        const currentSOH = row.cbsQty + row.gitQty;
        const currentSales = row.netSlsQty;
        
        // Sender Logic: 
        // - Has > 1.4x the average SKU SOH OR has massive absolute surplus (>20)
        // - And has at least 10 units in stock
        const isRelativeOverstock = currentSOH > (avgSOH * 1.4) && currentSOH > 10;
        const hasSurplus = currentSOH > (currentSales * 2) && currentSOH > 15;

        if (isRelativeOverstock || hasSurplus) {
          const surplus = Math.floor(currentSOH - (avgSOH * 0.8)); // Leave 80% of avg to sender
          if (surplus > 5) {
            senders.push({ ...row, surplus });
          }
        } 
        
        // Receiver Logic:
        // - Has < 0.6x the average SKU SOH OR absolute low stock (< 5)
        const isRelativeLow = currentSOH < (avgSOH * 0.6);
        const isAbsoluteLow = row.cbsQty < THRESHOLDS.CRITICAL_CBS;

        if (isRelativeLow || isAbsoluteLow) {
          const deficit = Math.max(Math.ceil(avgSOH * 1.2) - currentSOH, 5);
          receivers.push({ ...row, deficit });
        }
      }

      // 3. Match Senders to Receivers
      for (const recv of receivers) {
        // Find sender with most surplus
        const bestSender = [...senders]
          .filter(s => s.locationName !== recv.locationName)
          .sort((a, b) => b.surplus - a.surplus)[0];

        if (!bestSender) continue;

        const recommendedQty = Math.min(
          Math.floor(bestSender.surplus * 0.7), // Move up to 70% of sender's surplus
          recv.deficit
        );

        if (recommendedQty < 3) continue;

        suggestions.push({
          articleNo,
          fromStore:    bestSender.locationName,
          fromObs:      bestSender.obsQty,
          fromSurplus:  bestSender.surplus,
          toStore:      recv.locationName,
          toCbs:        recv.cbsQty,
          toDeficit:    recv.deficit,
          recommendedQty,
          urgency: recv.cbsQty < 3 ? 'HIGH' : recv.deficit > 10 ? 'MEDIUM' : 'LOW',
        });
      }
    }

    // Sort by urgency + qty
    const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return suggestions
      .sort((a, b) =>
        (urgencyOrder[a.urgency] - urgencyOrder[b.urgency]) ||
        (b.recommendedQty - a.recommendedQty)
      )
      .slice(0, TRANSFER.MAX_SUGGESTIONS);
  }
}

export default new SKUService();
