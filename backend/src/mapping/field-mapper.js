/**
 * FIELD MAPPER
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the three-tier mapping strategy:
 *   Tier 1: Vendor Profile (exact column overrides) — highest priority
 *   Tier 2: Semantic Matcher (fuzzy/synonym/token/edit-distance)
 *   Tier 3: AI Mappings (from Groq pre-processing) — fills gaps
 *
 * Outputs a resolved ColumnMap: { canonicalKey → columnIndex }
 * with confidence scores and an audit log for observability.
 */

import CANONICAL_FIELDS, { CRITICAL_FIELDS, FIELD_PRIORITY_ORDER } from './canonical-schema.js';
import { buildColumnMapping } from './semantic-matcher.js';
import { detectVendorProfile } from './vendor-profiles.js';

// ── Vendor Profile → Index Map ────────────────────────────────────────────

/**
 * Convert vendor profile column overrides (column name strings)
 * to column indices by looking them up in the headers array.
 *
 * @param {Object} columnOverrides  — { canonicalKey: 'Raw Header Name' }
 * @param {string[]} headers
 * @returns {Object} { canonicalKey: columnIndex }
 */
const resolveVendorOverrides = (columnOverrides, headers) => {
  const headersLower = headers.map(h => String(h || '').toLowerCase().trim());
  const resolved = {};

  for (const [canonicalKey, rawName] of Object.entries(columnOverrides)) {
    const targetLower = String(rawName).toLowerCase().trim();

    // Exact match first
    let idx = headersLower.indexOf(targetLower);

    // Case-insensitive partial match fallback
    if (idx === -1) {
      idx = headersLower.findIndex(h => h.includes(targetLower) || targetLower.includes(h));
    }

    if (idx !== -1) {
      resolved[canonicalKey] = { columnIndex: idx, rawHeader: headers[idx], confidence: 1.0, source: 'vendor' };
    }
  }

  return resolved;
};

// ── AI Mapping → Index Map ────────────────────────────────────────────────

/**
 * Convert AI-supplied mappings (column name strings) to column indices.
 *
 * @param {Object} aiMappings  — { mappings: { canonicalKey: 'Column Name' } }
 * @param {string[]} headers
 * @returns {Object}
 */
const resolveAIMappings = (aiMappings, headers) => {
  if (!aiMappings?.mappings) return {};
  const headersLower = headers.map(h => String(h || '').toLowerCase().trim());
  const resolved = {};

  for (const [canonicalKey, rawName] of Object.entries(aiMappings.mappings)) {
    if (!rawName || rawName === 'N/A' || !CANONICAL_FIELDS[canonicalKey]) continue;
    const targetLower = String(rawName).toLowerCase().trim();

    let idx = headersLower.indexOf(targetLower);
    if (idx === -1) {
      idx = headersLower.findIndex(h => h === targetLower);
    }
    if (idx !== -1) {
      resolved[canonicalKey] = { columnIndex: idx, rawHeader: headers[idx], confidence: 0.85, source: 'ai' };
    }
  }

  return resolved;
};

// ── Conflict Resolution ───────────────────────────────────────────────────

/**
 * Merge three mapping sources with priority: vendor > semantic > ai.
 * Ensures: no two canonical keys share the same column index.
 *
 * @param {Object} vendorMap
 * @param {Object} semanticMap  — output of buildColumnMapping
 * @param {Object} aiMap
 * @returns {Object} merged map
 */
const mergeMappings = (vendorMap, semanticMap, aiMap) => {
  const final = {};
  const usedColumns = new Set();

  const assign = (canonicalKey, entry) => {
    if (final[canonicalKey]) return; // Already assigned
    if (usedColumns.has(entry.columnIndex)) return; // Column already taken
    final[canonicalKey] = entry;
    usedColumns.add(entry.columnIndex);
  };

  // Tier 1: Vendor overrides (highest trust)
  for (const key of FIELD_PRIORITY_ORDER) {
    if (vendorMap[key]) assign(key, vendorMap[key]);
  }

  // Tier 2: Semantic matcher
  for (const key of FIELD_PRIORITY_ORDER) {
    if (semanticMap[key]) assign(key, { ...semanticMap[key], source: 'semantic' });
  }

  // Tier 3: AI mappings (fill remaining gaps)
  for (const key of FIELD_PRIORITY_ORDER) {
    if (aiMap[key]) assign(key, aiMap[key]);
  }

  return final;
};

// ── Cardinality Swap Detection ────────────────────────────────────────────

/**
 * Detect if locationName and articleNo columns are swapped
 * by checking cardinality: stores should repeat (low cardinality),
 * SKUs should be mostly unique (high cardinality).
 *
 * @param {Object} finalMap
 * @param {Array[]} dataRows
 */
const applyCardinalityCheck = (finalMap, dataRows) => {
  const locEntry = finalMap['locationName'];
  const artEntry = finalMap['articleNo'];
  if (!locEntry || !artEntry) return;

  const sampleSize = Math.min(dataRows.length, 200);
  const locValues = new Set();
  const artValues = new Set();

  for (let i = 0; i < sampleSize; i++) {
    const row = dataRows[i];
    const locVal = row[locEntry.columnIndex];
    const artVal = row[artEntry.columnIndex];
    if (locVal) locValues.add(String(locVal).trim());
    if (artVal) artValues.add(String(artVal).trim());
  }

  const locCardinality = locValues.size / sampleSize;
  const artCardinality = artValues.size / sampleSize;

  // If "location" column has very high cardinality → it's probably the SKU column
  if (locCardinality > 0.5 && artCardinality < 0.3) {
    const tmp = finalMap['locationName'];
    finalMap['locationName'] = { ...finalMap['articleNo'], rawHeader: finalMap['articleNo'].rawHeader };
    finalMap['articleNo'] = { ...tmp, rawHeader: tmp.rawHeader };
  }
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Build a final column map from raw headers + context.
 *
 * @param {string[]}  headers     — raw header strings from the sheet
 * @param {Array[]}   dataRows    — rows after the header row (for cardinality check)
 * @param {Array[]}   allRows     — all rows including pre-header (for vendor detection)
 * @param {Object|null} aiMappings — optional pre-processed AI mappings
 * @returns {{
 *   columnMap: Object,     // { canonicalKey: { columnIndex, rawHeader, confidence, source } }
 *   vendorProfile: Object|null,
 *   unmappedHeaders: string[],
 *   auditLog: string[]
 * }}
 */
export const buildFieldMap = (headers, dataRows, allRows, aiMappings = null) => {
  const auditLog = [];

  // ── Step 1: Vendor Detection ──
  const vendorProfile = detectVendorProfile(allRows);
  auditLog.push(vendorProfile
    ? `[VENDOR] Detected: ${vendorProfile.name}`
    : '[VENDOR] No vendor profile matched — using generic detection'
  );

  // ── Step 2: Vendor Overrides ──
  const vendorMap = vendorProfile
    ? resolveVendorOverrides(vendorProfile.columnOverrides, headers)
    : {};
  auditLog.push(`[VENDOR MAP] ${Object.keys(vendorMap).length} columns resolved via vendor profile`);

  // ── Step 3: Semantic Matching ──
  const { mapping: semanticRaw, unmappedHeaders } = buildColumnMapping(headers, 0.55);
  auditLog.push(`[SEMANTIC] ${Object.keys(semanticRaw).length} columns resolved via semantic matcher`);
  auditLog.push(`[SEMANTIC] Unmapped headers: ${unmappedHeaders.join(', ') || 'none'}`);

  // ── Step 4: AI Mappings ──
  const aiMap = resolveAIMappings(aiMappings, headers);
  auditLog.push(`[AI] ${Object.keys(aiMap).length} columns resolved via AI`);

  // ── Step 5: Merge with priority ──
  const columnMap = mergeMappings(vendorMap, semanticRaw, aiMap);
  auditLog.push(`[FINAL] ${Object.keys(columnMap).length} total canonical fields mapped`);

  // ── Step 6: Cardinality check (only if not a vendor-confirmed file) ──
  if (!vendorProfile && dataRows.length > 0) {
    applyCardinalityCheck(columnMap, dataRows);
    auditLog.push('[CARDINALITY] Swap check applied');
  }

  // ── Step 7: Critical field validation ──
  const missingCritical = CRITICAL_FIELDS.filter(k => !columnMap[k]);
  if (missingCritical.length > 0) {
    auditLog.push(`[WARN] Missing critical fields: ${missingCritical.join(', ')}`);
  }

  // ── Audit summary ──
  const mapSummary = Object.entries(columnMap)
    .map(([k, v]) => `${k}=${v.rawHeader}(${(v.confidence * 100).toFixed(0)}%,${v.source})`)
    .join(', ');
  auditLog.push(`[MAP DETAIL] ${mapSummary}`);

  return { columnMap, vendorProfile, unmappedHeaders, auditLog };
};

/**
 * Convenience: check if mapping has sufficient fields to be usable.
 */
export const isMappingViable = (columnMap) => {
  return CRITICAL_FIELDS.every(k => columnMap[k]);
};

export default { buildFieldMap, isMappingViable };
