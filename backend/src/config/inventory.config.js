/**
 * Inventory & Stock Status Configuration
 * Centralized business logic thresholds to avoid hardcoding.
 */
export const InventoryConfig = {
  // Stock Status Thresholds
  THRESHOLDS: {
    CRITICAL_CBS: 10,       // CBS qty below this = CRITICAL
    LOW_SELL_THRU: 5,       // Sell-through at or below this % => slow moving (not healthy)
    OVERSTOCK_RATIO: 3,     // OBS > 3x net sales = potentially overstock
    OVERSTOCK_MIN_QTY: 30,  // Must also have at least 30 units to count as overstock
    HIGH_SELL_THRU: 85,     // Sell-through above this = critical risk of stockout
  },

  // Transfer Matching Engine Logic
  TRANSFER: {
    MIN_SURPLUS: 20,        // Minimum extra units before suggesting a transfer
    MIN_QTY_TO_MOVE: 10,    // Don't suggest moving less than 10 units (real-world logistics)
    DEFICIT_BUFFER: 1.5,    // Suggest 150% of deficit to ensure safety stock
    MAX_SUGGESTIONS: 50     // Limit total suggestions per run
  },

  // Brand Validation Keywords
  BRAND: {
    NAME: 'OCTAVE',
    REQUIRED_KEYWORDS: ['OCTAVE', 'RETAIL', 'INVENTORY', 'SALES'],
    MIN_MATCHES: 1
  }
};
