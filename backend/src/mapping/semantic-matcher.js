/**
 * SEMANTIC MATCHER
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes similarity between raw Excel headers and canonical field definitions.
 * Layers of matching (applied in order of confidence):
 *   1. Exact match                → confidence 1.00
 *   2. Synonym match              → confidence 0.95
 *   3. Token Jaccard overlap      → confidence 0.50–0.85
 *   4. Levenshtein edit distance  → confidence 0.40–0.80
 *   5. Prefix / infix containment → confidence 0.60–0.75
 */

import CANONICAL_FIELDS from './canonical-schema.js';

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Normalize a string for comparison:
 * lowercase, collapse whitespace, remove non-alphanumeric except spaces.
 */
const normalize = (str) =>
  String(str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Tokenize a normalized string into unique tokens (min length 2).
 */
const tokenize = (str) =>
  [...new Set(normalize(str).split(' ').filter(t => t.length >= 2))];

/**
 * Levenshtein distance between two strings.
 */
const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

/**
 * Jaccard similarity between two token sets.
 */
const jaccard = (tokensA, tokensB) => {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

// ── Core Matching Engine ──────────────────────────────────────────────────

/**
 * Compute the best confidence score between a raw header and one canonical field.
 * Returns a confidence value between 0 and 1.
 */
const scoreField = (rawNorm, fieldDef) => {
  const { key, synonyms = [] } = fieldDef;

  // 1. Exact match against canonical key
  const keyNorm = normalize(key);
  if (rawNorm === keyNorm) return 1.0;

  // 2. Exact match against any synonym
  const synonymsNorm = synonyms.map(normalize);
  if (synonymsNorm.includes(rawNorm)) return 0.95;

  // 3. Token Jaccard — strong semantic overlap
  const rawTokens = tokenize(rawNorm);
  if (rawTokens.length === 0) return 0;

  let bestJaccard = 0;
  for (const syn of [keyNorm, ...synonymsNorm]) {
    const synTokens = tokenize(syn);
    const j = jaccard(rawTokens, synTokens);
    if (j > bestJaccard) bestJaccard = j;
  }
  // Map jaccard 0.5–1.0 → confidence 0.50–0.85
  const jaccardConf = bestJaccard >= 0.5 ? 0.50 + bestJaccard * 0.35 : 0;

  // 4. Prefix / infix containment
  let containmentConf = 0;
  const allSynonyms = [keyNorm, ...synonymsNorm];
  for (const syn of allSynonyms) {
    if (rawNorm.includes(syn) && syn.length >= 3) {
      containmentConf = Math.max(containmentConf, 0.60 + (syn.length / rawNorm.length) * 0.15);
    }
    if (syn.includes(rawNorm) && rawNorm.length >= 3) {
      containmentConf = Math.max(containmentConf, 0.55 + (rawNorm.length / syn.length) * 0.20);
    }
  }

  // 5. Levenshtein — only meaningful for short strings
  let editConf = 0;
  if (rawNorm.length <= 25) {
    for (const syn of allSynonyms) {
      if (Math.abs(rawNorm.length - syn.length) > 5) continue; // Skip if lengths diverge too much
      const dist = levenshtein(rawNorm, syn);
      const maxLen = Math.max(rawNorm.length, syn.length);
      const sim = 1 - dist / maxLen;
      if (sim > 0.8) {
        editConf = Math.max(editConf, 0.40 + sim * 0.40);
      }
    }
  }

  return Math.min(1.0, Math.max(jaccardConf, containmentConf, editConf));
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Match a single raw column header against ALL canonical fields.
 * Returns array of { canonicalKey, confidence } sorted descending.
 *
 * @param {string} rawHeader
 * @returns {{ canonicalKey: string, confidence: number }[]}
 */
export const matchHeader = (rawHeader) => {
  const rawNorm = normalize(rawHeader);
  if (!rawNorm) return [];

  const scores = Object.values(CANONICAL_FIELDS).map(fieldDef => ({
    canonicalKey: fieldDef.key,
    confidence: scoreField(rawNorm, fieldDef)
  }));

  return scores
    .filter(s => s.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
};

/**
 * Build a full column mapping from raw headers array.
 * Returns a map of { canonicalKey → { columnIndex, rawHeader, confidence } }
 * Resolves conflicts: each canonical field gets only ONE column (highest confidence).
 * Each column maps to only ONE canonical field (greedy assignment).
 *
 * @param {string[]} headers  — raw headers from the spreadsheet
 * @param {number} [minConfidence=0.55] — minimum confidence to accept a mapping
 * @returns {Object} mapping
 */
export const buildColumnMapping = (headers, minConfidence = 0.55) => {
  // Step 1: Score every (header × canonical field) pair
  const allScores = [];
  headers.forEach((h, colIdx) => {
    const rawNorm = normalize(h);
    if (!rawNorm) return;

    const matches = matchHeader(h);
    for (const { canonicalKey, confidence } of matches) {
      if (confidence >= minConfidence) {
        allScores.push({ colIdx, rawHeader: h, canonicalKey, confidence });
      }
    }
  });

  // Step 2: Sort all scores descending by confidence
  allScores.sort((a, b) => b.confidence - a.confidence);

  // Step 3: Greedy assignment — best score wins, each column & key used once
  const usedColumns = new Set();
  const usedKeys = new Set();
  const mapping = {};

  for (const score of allScores) {
    if (usedColumns.has(score.colIdx)) continue;
    if (usedKeys.has(score.canonicalKey)) continue;

    mapping[score.canonicalKey] = {
      columnIndex: score.colIdx,
      rawHeader: score.rawHeader,
      confidence: score.confidence
    };

    usedColumns.add(score.colIdx);
    usedKeys.add(score.canonicalKey);
  }

  // Step 4: Record unmapped columns for observability
  const mappedColIndices = new Set(Object.values(mapping).map(m => m.columnIndex));
  const unmappedHeaders = headers
    .map((h, i) => ({ header: h, colIdx: i }))
    .filter(({ colIdx }) => !mappedColIndices.has(colIdx) && normalize(headers[colIdx]))
    .map(({ header }) => header);

  return { mapping, unmappedHeaders };
};

/**
 * Detect the most likely header row in raw rows array.
 * Uses density of recognizable column headers as the signal.
 *
 * @param {Array[]} rows - raw sheet rows (XLSX.utils.sheet_to_json with header:1)
 * @param {number} maxRowsToCheck
 * @returns {number} index of header row, or -1
 */
export const detectHeaderRow = (rows, maxRowsToCheck = 40) => {
  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, maxRowsToCheck); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Skip rows where first cell is a very long descriptive string (filter descriptions)
    const firstCell = String(row[0] || '');
    if (firstCell.length > 80) continue;

    // Count cells that have a good canonical match
    let recognizedCount = 0;
    for (const cell of row) {
      const cellStr = String(cell || '').trim();
      if (!cellStr || cellStr.length > 60) continue;
      const matches = matchHeader(cellStr);
      if (matches.length > 0 && matches[0].confidence >= 0.70) {
        recognizedCount++;
      }
    }

    // Non-empty cell count
    const nonEmptyCells = row.filter(c => String(c || '').trim().length > 0).length;
    if (nonEmptyCells < 3) continue;

    // Score = fraction of non-empty cells that are recognized headers
    const score = recognizedCount / nonEmptyCells;

    if (score > bestScore && recognizedCount >= 2) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
};

export default { matchHeader, buildColumnMapping, detectHeaderRow };
