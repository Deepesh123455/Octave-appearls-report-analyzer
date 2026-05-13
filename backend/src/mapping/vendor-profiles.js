/**
 * VENDOR PROFILES
 * ─────────────────────────────────────────────────────────────────────────────
 * Known vendor-specific column name overrides.
 * When a file is detected as matching a vendor profile, these mappings
 * take precedence over the generic semantic matcher, eliminating ambiguity.
 *
 * Adding a new vendor: add a new entry to VENDOR_PROFILES below.
 * Detection is based on keywords found in the file's early rows.
 */

export const VENDOR_PROFILES = {

  /**
   * Octave Apparels — Standard location-level report
   */
  octave_location: {
    name: 'Octave Apparels — Location Report',
    detectionKeywords: ['octave', 'obs qty', 'net sls qty', 'sale thru %'],
    detectionThreshold: 2,
    columnOverrides: {
      locationName:          'Location Name',
      sectionName:           'Section Name',
      subSectionName:        'Sub Section Name',
      articleNo:             'Article No',
      colorName:             'Color Name',
      fabric:                'Fabric',
      category:              'Category',
      description:           'Description',
      obsQty:                'OBS Qty',
      gitQty:                'GIT Qty',
      groupPurQty:           'Group Pur Qty',
      netSlsQty:             'Net SLS Qty',
      groupPrtQty:           'Group Prt Qty',
      deliveryChallanQty:    'Delivery Challan Qty',
      groupWslQty:           'Group Wsl Qty',
      cbsQty:                'CBS Qty',
      saleThruPct:           'Sale Thru %',
      asm:                   'ASM',
    }
  },

  /**
   * Octave Apparels — Consolidated (network-wide) report
   */
  octave_consolidated: {
    name: 'Octave Apparels — Consolidated Report',
    detectionKeywords: ['octave', 'consolidate', 'obs qty', 'net sls qty'],
    detectionThreshold: 2,
    columnOverrides: {
      sectionName:           'Section Name',
      subSectionName:        'Sub Section Name',
      articleNo:             'Article No',
      colorName:             'Color Name',
      fabric:                'Fabric',
      category:              'Category',
      description:           'Description',
      obsQty:                'OBS Qty',
      gitQty:                'GIT Qty',
      groupPurQty:           'Group Pur Qty',
      netSlsQty:             'Net SLS Qty',
      groupPrtQty:           'Group Prt Qty',
      deliveryChallanQty:    'Delivery Challan Qty',
      groupWslQty:           'Group Wsl Qty',
      cbsQty:                'CBS Qty',
      saleThruPct:           'Sale Thru %',
    }
  },

  /**
   * Generic SAP Retail / MM module exports
   */
  sap_retail: {
    name: 'SAP Retail Export',
    detectionKeywords: ['matnr', 'werks', 'plant', 'material', 'sloc'],
    detectionThreshold: 2,
    columnOverrides: {
      articleNo:      'MATNR',
      locationName:   'WERKS',
      sectionName:    'MATKL',
      description:    'MAKTX',
      obsQty:         'LABST',
      cbsQty:         'CLABS',
      netSlsQty:      'ABSMG',
      mrp:            'NETPR',
      costPrice:      'STPRS',
      fabric:         'GROES',
      season:         'SAISO',
      brand:          'MFRNR',
    }
  },

  /**
   * Generic retail POS export (common in mid-market retail software)
   */
  generic_pos: {
    name: 'Generic POS Export',
    detectionKeywords: ['product code', 'store name', 'units sold', 'closing stock'],
    detectionThreshold: 2,
    columnOverrides: {
      articleNo:      'Product Code',
      locationName:   'Store Name',
      description:    'Product Name',
      colorName:      'Variant',
      obsQty:         'Opening Stock',
      cbsQty:         'Closing Stock',
      netSlsQty:      'Units Sold',
      returnQty:      'Returns',
      mrp:            'Selling Price',
      category:       'Category',
      brand:          'Brand',
    }
  },

};

/**
 * Detect which vendor profile best matches the given file content.
 * Scans the first `scanRows` rows for detection keywords.
 *
 * @param {Array[]} rows  — raw sheet rows
 * @param {number}  scanRows
 * @returns {Object|null} matched vendor profile or null
 */
export const detectVendorProfile = (rows, scanRows = 20) => {
  const sampleText = rows
    .slice(0, scanRows)
    .map(r => (Array.isArray(r) ? r : [r]).join(' '))
    .join(' ')
    .toLowerCase();

  let bestProfile = null;
  let bestMatchCount = 0;

  for (const profile of Object.values(VENDOR_PROFILES)) {
    const matchCount = profile.detectionKeywords.filter(kw =>
      sampleText.includes(kw.toLowerCase())
    ).length;

    if (matchCount >= profile.detectionThreshold && matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestProfile = profile;
    }
  }

  return bestProfile;
};

export default { VENDOR_PROFILES, detectVendorProfile };
