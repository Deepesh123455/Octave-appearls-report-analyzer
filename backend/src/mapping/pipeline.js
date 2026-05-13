/**
 * PARSING PIPELINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Full orchestration of file parsing:
 *   1. Read Excel buffer → raw rows
 *   2. Detect header row (semantic)
 *   3. Build field map (vendor → semantic → AI)
 *   4. Validate mapping viability
 *   5. Parse each data row into canonical fields
 *   6. Normalize values per data type
 *   7. Filter junk rows
 *   8. Detect consolidated vs location report
 *   9. Return structured result with audit metadata
 */

import XLSX from 'xlsx';
import CANONICAL_FIELDS, { CRITICAL_FIELDS } from './canonical-schema.js';
import { detectHeaderRow } from './semantic-matcher.js';
import { buildFieldMap, isMappingViable } from './field-mapper.js';
import { normalizeValue, isJunkRow } from './normalization-rules.js';

// ── Row Extraction ────────────────────────────────────────────────────────

/**
 * Extract a single canonical row object from a raw Excel row.
 *
 * @param {Array} rawRow        — raw XLSX row array
 * @param {Object} columnMap    — { canonicalKey: { columnIndex, ... } }
 * @returns {Object}            — { canonicalKey: normalizedValue, ... }
 */
const extractRow = (rawRow, columnMap) => {
  const extracted = {};
  for (const [canonicalKey, entry] of Object.entries(columnMap)) {
    const fieldDef = CANONICAL_FIELDS[canonicalKey];
    if (!fieldDef) continue;
    const rawValue = rawRow[entry.columnIndex];
    extracted[canonicalKey] = normalizeValue(rawValue, fieldDef.dataType, canonicalKey);
  }
  return extracted;
};

// ── Consolidated Detection ────────────────────────────────────────────────

/**
 * Determine if the file is a consolidated (network-wide) report
 * or a per-location report.
 */
const detectIsConsolidated = (allRows, headerIdx, columnMap) => {
  // If no location column was mapped → consolidated
  if (!columnMap['locationName']) return true;

  // If any pre-header rows mention "consolidate" → consolidated
  const preHeaderText = allRows
    .slice(0, Math.min(headerIdx, 10))
    .map(r => (Array.isArray(r) ? r : [r]).join(' '))
    .join(' ')
    .toLowerCase();

  if (preHeaderText.includes('consolidat') || preHeaderText.includes('aggregat')) return true;

  return false;
};

// ── Junk Row Categories ───────────────────────────────────────────────────

const CATEGORY_JUNK = ['men', 'women', 'kids', 'accessories', 'total', 'grand total', 'sub total'];
const isArticleJunk = (val) => {
  if (!val) return true;
  const upper = String(val).toUpperCase().trim();
  return CATEGORY_JUNK.includes(upper.toLowerCase()) || upper === 'N/A';
};

// ── Main Pipeline ─────────────────────────────────────────────────────────

/**
 * Process an Excel file buffer through the full parsing pipeline.
 *
 * @param {Buffer}      fileBuffer
 * @param {Object|null} aiMappings  — optional pre-computed AI mappings
 * @returns {{
 *   rows: Object[],
 *   reportType: 'location' | 'consolidated',
 *   mappedFields: string[],
 *   unmappedHeaders: string[],
 *   auditLog: string[],
 *   vendorProfile: string | null
 * }}
 */
export const runPipeline = (fileBuffer, aiMappings = null) => {
  const auditLog = [];

  // ── 1. Read Excel ──
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!allRows || allRows.length === 0) {
    throw new Error('File is empty or unreadable.');
  }
  auditLog.push(`[PARSE] Total rows in sheet: ${allRows.length}`);

  // ── 2. Detect header row ──
  let headerIdx = -1;

  // Try AI-provided header index first (validate it)
  if (aiMappings?.headerRowIndex !== undefined) {
    const aiIdx = aiMappings.headerRowIndex;
    const aiFirstCell = String(allRows[aiIdx]?.[0] || '').toLowerCase();
    if (!aiFirstCell.includes('filter') && !aiFirstCell.includes('additional') && aiFirstCell.length < 100) {
      headerIdx = aiIdx;
      auditLog.push(`[HEADER] Used AI-provided header row: ${headerIdx}`);
    }
  }

  if (headerIdx === -1) {
    headerIdx = detectHeaderRow(allRows);
    auditLog.push(`[HEADER] Semantic header detection → row ${headerIdx}`);
  }

  if (headerIdx === -1) {
    throw new Error(
      'Could not find column headers. Ensure your file has recognizable column names like "Article No", "SKU", "Sales Qty", "Closing Stock" etc.'
    );
  }

  const headers = allRows[headerIdx].map(h => String(h || '').trim());
  const dataRows = allRows.slice(headerIdx + 1);
  auditLog.push(`[HEADER] Headers (${headers.length}): ${headers.filter(Boolean).join(' | ')}`);

  // ── 3. Build field map ──
  const { columnMap, vendorProfile, unmappedHeaders, auditLog: mapLog } =
    buildFieldMap(headers, dataRows, allRows, aiMappings);
  auditLog.push(...mapLog);

  // ── 4. Validate viability ──
  if (!isMappingViable(columnMap)) {
    throw new Error(
      `File rejected: Could not identify a SKU/Article column. ` +
      `Ensure your file has a column for article/product/SKU identifiers. ` +
      `Headers found: ${headers.filter(Boolean).join(', ')}`
    );
  }

  // ── 5. Detect report type ──
  const isConsolidated = detectIsConsolidated(allRows, headerIdx, columnMap);
  const reportType = isConsolidated ? 'consolidated' : 'location';
  auditLog.push(`[FORMAT] Report type: ${reportType}`);

  // ── 6. Parse data rows ──
  let parsedCount = 0;
  let skippedJunk = 0;
  let skippedInvalid = 0;

  const rows = dataRows
    .map((rawRow, i) => {
      if (!Array.isArray(rawRow) || rawRow.every(c => String(c || '').trim() === '')) return null;

      const extracted = extractRow(rawRow, columnMap);

      // Determine the primary identifier for junk detection
      const articleVal = extracted['articleNo'];
      const locationVal = extracted['locationName'];
      const primaryVal = isConsolidated ? articleVal : (locationVal || articleVal);

      if (isJunkRow(primaryVal)) { skippedJunk++; return null; }
      if (isArticleJunk(articleVal)) { skippedJunk++; return null; }

      // For location reports: require a non-empty location
      if (!isConsolidated && !locationVal) { skippedInvalid++; return null; }

      // Self-reference guard: if location === article, treat as consolidated
      if (extracted['locationName'] && extracted['locationName'] === extracted['articleNo']) {
        extracted['locationName'] = 'NETWORK_WIDE';
      }

      // For consolidated: use fixed location
      if (isConsolidated && !extracted['locationName']) {
        extracted['locationName'] = 'NETWORK_WIDE';
      }

      // Apply defaults for required string fields
      if (!extracted['articleNo']) { skippedInvalid++; return null; }
      extracted['colorName'] = extracted['colorName'] || 'N/A';
      extracted['sectionName'] = extracted['sectionName'] || 'N/A';
      extracted['subSectionName'] = extracted['subSectionName'] || 'N/A';
      extracted['category'] = extracted['category'] || 'General';
      extracted['asm'] = extracted['asm'] || 'N/A';

      parsedCount++;
      return extracted;
    })
    .filter(Boolean);

  auditLog.push(`[RESULT] Parsed: ${parsedCount}, Junk skipped: ${skippedJunk}, Invalid skipped: ${skippedInvalid}`);
  auditLog.push(`[RESULT] Final row count: ${rows.length}`);

  return {
    rows,
    reportType,
    mappedFields: Object.keys(columnMap),
    unmappedHeaders,
    auditLog,
    vendorProfile: vendorProfile?.name || null,
  };
};

export default { runPipeline };
