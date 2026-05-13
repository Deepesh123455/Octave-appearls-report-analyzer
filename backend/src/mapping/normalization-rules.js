/**
 * NORMALIZATION RULES
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-dataType value transformation functions.
 * Each rule accepts a raw cell value and returns a clean, typed value.
 * Returns null for missing/unparseable values (callers should apply defaults).
 */

// ── Helpers ───────────────────────────────────────────────────────────────

const isEmpty = (v) =>
  v === null || v === undefined || String(v).trim() === '' ||
  ['n/a', 'na', 'null', 'nil', 'none', '-', '--', '#n/a', '#ref!', '#value!', '#div/0!']
    .includes(String(v).toLowerCase().trim());

const stripCurrency = (str) =>
  String(str).replace(/[₹$€£¥,\s]/g, '').trim();

// ── Type Transformers ─────────────────────────────────────────────────────

/**
 * Integer fields: OBS Qty, CBS Qty, Net SLS Qty, etc.
 * Handles: parentheses for negatives "(5)" → -5, trailing text, empty
 */
const toInteger = (raw) => {
  if (isEmpty(raw)) return 0;
  let str = String(raw).trim();
  const isNegative = str.startsWith('(') && str.endsWith(')');
  str = str.replace(/[()]/g, '').replace(/,/g, '').trim();
  const num = parseInt(str, 10);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
};

/**
 * Decimal fields: MRP, ASP, Cost Price, Net Sales Value
 */
const toDecimal = (raw) => {
  if (isEmpty(raw)) return null;
  const str = stripCurrency(raw).replace(/[()]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
};

/**
 * Percentage fields: Sale Thru %, Discount %
 * Auto-normalizes 0–1 range to 0–100.
 */
const toPercentage = (raw) => {
  if (isEmpty(raw)) return 0;
  let str = String(raw).replace(/%/g, '').replace(/[()]/g, '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  // If stored as fraction (0–1 range), convert to percentage
  if (num > 0 && num <= 1.0) return Math.round(num * 1000) / 10;
  return Math.max(0, Math.round(num * 10) / 10);
};

/**
 * String fields: locationName, articleNo, colorName, etc.
 * Trims, collapses whitespace, normalizes null-like values to 'N/A'.
 */
const toString = (raw, defaultValue = 'N/A') => {
  if (isEmpty(raw)) return defaultValue;
  return String(raw).trim().replace(/\s+/g, ' ');
};

/**
 * Normalize gender value to canonical form.
 */
const toGender = (raw) => {
  if (isEmpty(raw)) return null;
  const val = String(raw).toLowerCase().trim();
  if (['m','men','male','mens','gents','man'].includes(val)) return 'Men';
  if (['f','women','female','womens','ladies','woman','girl','girls'].includes(val)) return 'Women';
  if (['k','kids','child','children','boy','boys'].includes(val)) return 'Kids';
  if (['u','unisex','all','universal'].includes(val)) return 'Unisex';
  return String(raw).trim();
};

// ── Rule Registry ─────────────────────────────────────────────────────────

export const NORMALIZATION_RULES = {
  string:     (raw) => toString(raw, 'N/A'),
  integer:    (raw) => toInteger(raw),
  decimal:    (raw) => toDecimal(raw),
  percentage: (raw) => toPercentage(raw),
  gender:     (raw) => toGender(raw),
};

/**
 * Apply the correct normalization rule based on dataType.
 *
 * @param {*} rawValue — raw cell value from Excel
 * @param {string} dataType — from canonical schema ('string'|'integer'|'decimal'|'percentage')
 * @param {string} [canonicalKey] — used for special-case handling (gender, barcode, etc.)
 * @returns {*} normalized value
 */
export const normalizeValue = (rawValue, dataType, canonicalKey = '') => {
  // Special-case overrides
  if (canonicalKey === 'gender') return toGender(rawValue);
  if (canonicalKey === 'barcode') return isEmpty(rawValue) ? null : String(rawValue).trim();

  const rule = NORMALIZATION_RULES[dataType] || NORMALIZATION_RULES.string;
  return rule(rawValue);
};

/**
 * Validate and clean an entire mapped row object using field definitions.
 * Applies normalization per field and strips out fields that mapped to null.
 *
 * @param {Object} rawMappedRow — { canonicalKey: rawValue, ... }
 * @param {Object} fieldDefs — CANONICAL_FIELDS
 * @returns {Object} cleaned row
 */
export const normalizeRow = (rawMappedRow, fieldDefs) => {
  const cleaned = {};
  for (const [key, rawValue] of Object.entries(rawMappedRow)) {
    const def = fieldDefs[key];
    if (!def) {
      cleaned[key] = rawValue;
      continue;
    }
    cleaned[key] = normalizeValue(rawValue, def.dataType, key);
  }
  return cleaned;
};

/**
 * Junk row detection — skip subtotals, totals, blank separators.
 */
const JUNK_PATTERNS = [
  'total','grand total','sub total','subtotal','summary',
  'printed on','printed by','n/a','#n/a','#ref!','#value!','#div/0!',
  'page','report','date','filter','additional','generated'
];

export const isJunkRow = (primaryValue) => {
  if (!primaryValue && primaryValue !== 0) return true;
  const n = String(primaryValue).toLowerCase().trim();
  if (!n) return true;
  return JUNK_PATTERNS.some(p => n === p || n.startsWith(p + ' ') || n.startsWith('printed'));
};

export default { normalizeValue, normalizeRow, isJunkRow, NORMALIZATION_RULES };
