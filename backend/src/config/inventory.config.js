/**
 * Inventory & Stock Status Configuration
 * Centralized business logic thresholds to avoid hardcoding.
 */
export const InventoryConfig = {
  // Stock Status Analysis Thresholds (Weeks of Stock - WOS)
  THRESHOLDS: {
    WOS_CRITICAL: 0.8,       // CBS / Sales < 0.8 weeks = CRITICAL
    WOS_LOW: 1.8,            // CBS / Sales < 1.8 weeks = LOW STOCK
    WOS_OVERSTOCK: 8.0,      // CBS / Sales > 8.0 weeks = OVERSTOCK
    MIN_SALES_FOR_WOS: 1,    // Minimum sales to trust WOS calculation
    STATIC_SELL_THRU_HIGH: 85, // Fallback for high-demand items
    STATIC_SELL_THRU_LOW: 10,  // Fallback for stagnant items
    CRITICAL_CBS: 5,        // Absolute minimum stock before critical alert
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
