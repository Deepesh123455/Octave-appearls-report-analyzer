import { parentPort, workerData } from 'worker_threads'
import XLSX from 'xlsx'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'

const parseNumber = (value, isPercentageField = false) => {
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value).replace(/%/g, '').replace(/[()]/g, '').trim();
  let num = Number(str);
  if (isNaN(num)) return 0;
  if (isPercentageField && num > 0 && num <= 1.0) return num * 100;
  // Sell-thru can't be negative in a meaningful way — clamp to 0
  if (isPercentageField) return Math.max(0, num);
  return num;
}

const rowSchema = z.object({
  locationName: z.string().min(1),
  sectionName: z.string().default('N/A'),
  subSectionName: z.string().default('N/A'),
  articleNo: z.string().default('N/A'),
  colorName: z.string().default('N/A'),
  category: z.string().default('General'),
  obsQty: z.number().default(0),
  netSlsQty: z.number().default(0),
  saleThruPercent: z.number().default(0),
  gitQty: z.number().default(0),
  cbsQty: z.number().default(0)
})

const JUNK_PATTERNS = [
  'total', 'summary', 'grand total', 'sub total', 'printed on', 'printed by',
  'n/a', '#n/a', '#ref!', '#value!', '#div/0!'
]

const isJunkRow = (name) => {
  const n = name.toLowerCase().trim()
  if (!n) return true
  return JUNK_PATTERNS.some(p => n.includes(p)) || n.startsWith('printed')
}

const getIdx = (headers, exactName, synonyms = []) => {
  const normHeaders = headers.map(h => String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  // 1. Exact or Synonym match (Strongest)
  const targets = [exactName, ...synonyms].map(s => s.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  for (const target of targets) {
    const idx = normHeaders.indexOf(target);
    if (idx !== -1) return idx;
  }

  // 2. Fuzzy Containment Match (Medium)
  for (const target of targets) {
    if (target.length < 3) continue;
    const idx = normHeaders.findIndex(nh => nh.includes(target) || target.includes(nh));
    if (idx !== -1) return idx;
  }

  return -1;
}

const processFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (!rows || rows.length === 0) throw new Error('Empty spreadsheet.')

  // ── 0. Brand & Format Heuristic ──────────────────────────────────────────
  // Check first 15 rows for mandatory keywords to ensure it's an Octave report.
  let brandMatch = false;
  const sampleText = rows.slice(0, 15).map(r => r.join(' ')).join(' ').toUpperCase();
  
  const keywords = ['OCTAVE', 'RETAIL', 'INVENTORY', 'SALE', 'ASM', 'OBS QTY'];
  const matches = keywords.filter(k => sampleText.includes(k));
  
  if (matches.length < 2) {
    throw new Error('Rejected: Invalid Report Format. This analyzer only accepts Octave Apparels inventory/sales reports.');
  }

  // ── 1. Find header row (works for both formats) ──────────────────────────
  let headerIndex = -1
  
  // Use AI discovered header index ONLY if it points to a valid header row (not a filter description)
  if (workerData.aiMappings && typeof workerData.aiMappings.headerRowIndex === 'number') {
    const aiRow = workerData.aiMappings.headerRowIndex;
    const aiFirstCell = String(rows[aiRow]?.[0] || '').toLowerCase();
    // Reject if it's a filter description row
    if (!aiFirstCell.includes('filter') && !aiFirstCell.includes('additional') && aiFirstCell.length < 100) {
      headerIndex = aiRow;
    }
  }
  
  // Always fall through to strict keyword search if AI header was rejected or unavailable
  if (headerIndex === -1) {
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i].map(c => String(c || '').toLowerCase().trim())
      
      // Skip filter description rows (long strings with "filter", "additional", etc.)
      const firstCell = String(rows[i][0] || '').toLowerCase();
      if (firstCell.includes('filter') || firstCell.includes('additional') || firstCell.length > 100) continue;
      
      // Require at least 2 distinct header keywords as separate cell values
      const headerKeywords = ['obs qty', 'net sls qty', 'sale thru %', 'cbs qty', 'git qty', 'asm', 'location name', 'section name', 'article no', 'color name', 'sub section name'];
      const matchCount = headerKeywords.filter(kw => row.includes(kw)).length;
      if (matchCount >= 2) {
        headerIndex = i
        break
      }
    }
  }

  if (headerIndex === -1) throw new Error('Could not find header row. Please ensure your file contains column headers like ASM, Net SLS Qty or Sale Thru %.')

  const headers = rows[headerIndex].map(h => String(h || '').trim())
  const rawDataRows = rows.slice(headerIndex + 1)

  // ── 2. Detect file format ─────────────────────────────────────────────────
  let foundConsolidatedKeyword = false
  for (let i = 0; i < Math.min(headerIndex, 10); i++) {
    const rowStr = rows[i].join(' ').toLowerCase()
    if (rowStr.includes('consolidate') || rowStr.includes('aggregated')) {
      foundConsolidatedKeyword = true
      break
    }
  }

  const hasLocationCol = headers.some(h => h.toLowerCase().includes('location name'))
  // Only mark as consolidated if there is NO location column AND the keyword is found,
  // or if AI explicitly confirmed it.
  let isConsolidated = !hasLocationCol;

  // Override with AI result if available
  if (workerData.aiMappings && typeof workerData.aiMappings.isConsolidated === 'boolean') {
    isConsolidated = workerData.aiMappings.isConsolidated;
  }

  // Log detected format
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_headers.txt'),
      `FORMAT: ${isConsolidated ? 'CONSOLIDATED' : 'LOCATION'}\nHEADERS: ${headers.join(' | ')}`
    )
  } catch (e) {}

  // ── 3. Build column index map ─────────────────────────────────────────────
  const ai = workerData.aiMappings;
  const aiMap = ai?.mappings || {};

  // Helper: case-insensitive header lookup for AI-provided column names
  const aiIdx = (name) => {
    if (!name || name === 'N/A') return -1;
    const exact = headers.indexOf(name);
    if (exact !== -1) return exact;
    // Case-insensitive fallback
    const lower = name.toLowerCase().trim();
    return headers.findIndex(h => String(h).toLowerCase().trim() === lower);
  };

  // Build idxMap using PURE HEURISTICS first (the proven approach)
  const buildHeuristicMap = () => ({
    loc:   isConsolidated ? -1 : getIdx(headers, 'Location Name'),
    sec:   getIdx(headers, 'Section Name', ['section name', 'section']),
    sub:   getIdx(headers, 'Sub Section Name', ['sub section', 'sub-section', 'subsection']),
    art:   isConsolidated
             ? getIdx(headers, 'Article No', ['article no', 'articleno', 'article', 'asm', 'sku', 'code'])
             : getIdx(headers, 'Asm', ['asm', 'article no', 'article', 'sku', 'code']),
    color: getIdx(headers, 'Color Name', ['color name', 'colour name', 'color', 'col']),
    cat:   isConsolidated
             ? getIdx(headers, 'Category', ['category', 'cat', 'group'])
             : getIdx(headers, 'Locgroup', ['locgroup', 'loc group', 'category']),
    obs:   getIdx(headers, 'OBS Qty',      ['obs qty', 'obsqty', 'obs', 'opening', 'opening stock']),
    sls:   getIdx(headers, 'Net SLS Qty',  ['net sls qty', 'netslsqty', 'net sales', 'sales', 'sold', 'qty sold']),
    thr:   getIdx(headers, 'Sale Thru %',  ['sale thru %', 'salethru%', 'sell thru %', 'sale thru', 'st %', 'sell-thru']),
    git:   getIdx(headers, 'GIT Qty',      ['git qty', 'gitqty', 'git', 'in transit', 'transit', 'intransit']),
    cbs:   getIdx(headers, 'CBS Qty',      ['cbs qty', 'cbsqty', 'cbs', 'closing', 'closing stock', 'stock', 'available']),
  });

  // Build idxMap using AI mappings
  const buildAIMap = () => ({
    loc:   aiIdx(aiMap.locationName),
    sec:   aiIdx(aiMap.sectionName),
    sub:   aiIdx(aiMap.subSectionName),
    art:   aiIdx(aiMap.articleNo),
    color: aiIdx(aiMap.colorName),
    cat:   aiIdx(aiMap.category),
    obs:   aiIdx(aiMap.obsQty),
    sls:   aiIdx(aiMap.netSlsQty),
    thr:   aiIdx(aiMap.saleThruPercent),
    git:   aiIdx(aiMap.gitQty),
    cbs:   aiIdx(aiMap.cbsQty),
  });

  // Validate a mapping: check for duplicate indices and missing critical fields
  const validateMap = (map, label) => {
    const usedIndices = [];
    const coreTextFields = ['loc', 'art']; // Must be different columns
    const coreNumFields = ['sls', 'cbs', 'obs']; // At least 2 must resolve

    // Check: Location and Article must not share the same column
    if (map.loc !== -1 && map.loc === map.art) return false;
    // Check: Section and Article must not share the same column
    if (map.sec !== -1 && map.sec === map.art) return false;

    // Check: At least 2 numeric fields must resolve
    const numResolved = coreNumFields.filter(k => map[k] !== -1).length;
    if (numResolved < 1) return false;

    // Check: Article must resolve
    if (map.art === -1) return false;

    // Check for excessive duplicate indices (more than 2 fields sharing same column)
    const allIndices = Object.values(map).filter(v => v !== -1);
    const indexCounts = {};
    allIndices.forEach(i => { indexCounts[i] = (indexCounts[i] || 0) + 1; });
    const maxDupes = Math.max(0, ...Object.values(indexCounts));
    if (maxDupes > 2) return false; // More than 2 fields on same column = broken mapping

    return true;
  };

  // ── STRATEGY: Heuristics FIRST (proven for standard Octave reports).
  //    AI only as FALLBACK when heuristics fail.
  let idxMap;
  const heuristicCandidate = buildHeuristicMap();

  if (validateMap(heuristicCandidate, 'HEURISTIC')) {
    idxMap = heuristicCandidate;
    try {
      fs.appendFileSync(path.join(process.cwd(), 'debug_headers.txt'), '\nMAPPING SOURCE: HEURISTIC (primary, validated)')
    } catch (e) {}
  } else {
    // Heuristics failed — try AI
    const aiCandidate = Object.keys(aiMap).length > 0 ? buildAIMap() : null;
    if (aiCandidate && validateMap(aiCandidate, 'AI')) {
      idxMap = aiCandidate;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'debug_headers.txt'), '\nMAPPING SOURCE: AI (fallback, validated)')
      } catch (e) {}
    } else {
      // Both failed — use heuristic anyway (best effort)
      idxMap = heuristicCandidate;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'debug_headers.txt'), '\nMAPPING SOURCE: HEURISTIC (forced, both failed)')
      } catch (e) {}
    }
  }

  // Final safety: ensure loc != art
  if (idxMap.loc !== -1 && idxMap.loc === idxMap.art) {
    idxMap.loc = -1;
  }

  // ── CARDINALITY CHECK: Detect if Location and Article columns are swapped.
  //    Stores repeat across many rows (low unique count), SKUs are mostly unique (high unique count).
  if (idxMap.loc >= 0 && idxMap.art >= 0) {
    const sampleSize = Math.min(rawDataRows.length, 200);
    const locValues = new Set();
    const artValues = new Set();
    for (let i = 0; i < sampleSize; i++) {
      const row = rawDataRows[i];
      if (row[idxMap.loc]) locValues.add(String(row[idxMap.loc]).trim());
      if (row[idxMap.art]) artValues.add(String(row[idxMap.art]).trim());
    }

    const locCardinality = locValues.size / sampleSize; // Low = good (stores repeat)
    const artCardinality = artValues.size / sampleSize; // High = good (SKUs unique)

    // If location has MORE unique values than article, they're probably swapped
    if (locCardinality > 0.5 && artCardinality < 0.3) {
      try {
        fs.appendFileSync(path.join(process.cwd(), 'debug_headers.txt'),
          `\nCARDINALITY SWAP DETECTED: loc=${locValues.size}/${sampleSize} (${(locCardinality*100).toFixed(0)}%), art=${artValues.size}/${sampleSize} (${(artCardinality*100).toFixed(0)}%). SWAPPING.`)
      } catch (e) {}
      const tmp = idxMap.loc;
      idxMap.loc = idxMap.art;
      idxMap.art = tmp;
    }
  }

  // Diagnostic: Log the full mapping for debugging
  try {
    const mapDebug = Object.entries(idxMap)
      .map(([k, v]) => `${k}=${v} (${v >= 0 ? headers[v] : 'NOT FOUND'})`)
      .join(', ');
    fs.appendFileSync(
      path.join(process.cwd(), 'debug_headers.txt'),
      `\nIDX MAP: ${mapDebug}`
    )
  } catch (e) {}

  const missing = Object.entries(idxMap).filter(([k, v]) => v === -1 && k !== 'loc' && k !== 'color').map(([k]) => k);
  if (missing.length > 0) {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), 'debug_headers.txt'),
        `\nMISSING FIELDS: ${missing.join(', ')}`
      )
    } catch (e) {}
  }

  // ── 4. Parse rows ─────────────────────────────────────────────────────────
  let debugCounter = 0;
  const finalRows = rawDataRows
    .map(row => {
      // Determine location name
      let location
      if (isConsolidated) {
        // For consolidated: Do not use SKU as location. Use a fixed master label.
        location = "NETWORK_WIDE"
      } else {
        location = row[idxMap.loc] ? String(row[idxMap.loc]).trim() : ''
        if (!location) return null
      }

      if (isJunkRow(location)) return null

      const sectionName    = idxMap.sec >= 0 && row[idxMap.sec] ? String(row[idxMap.sec]).trim() : 'N/A'
      const subSectionName = idxMap.sub >= 0 && row[idxMap.sub] ? String(row[idxMap.sub]).trim() : 'N/A'

      // For consolidated: skip junk sections
      if (isConsolidated && isJunkRow(sectionName)) return null

      // For consolidated leaf: use Color Name or Description; for location report: use Asm
      // Support both styles: if SKU column exists, use it. 
      // In some consolidated reports, SKU Column might be missing or labelled as something else.
      let articleNo;
      if (idxMap.art >= 0) {
        articleNo = String(row[idxMap.art] || '').trim();
      } else if (isConsolidated) {
        // Fallback for consolidated reports without SKU column
        articleNo = idxMap.color >= 0 && row[idxMap.color] ? String(row[idxMap.color]).trim() : sectionName;
      } else {
        articleNo = 'N/A';
      }

      // SELF-REFERENCE GUARD: If location is same as article, this is consolidated or wrong mapping
      if (location === articleNo) {
        location = "NETWORK_WIDE"
      }

      // COLOR EXTRACTION
      const colorVal = idxMap.color >= 0 && row[idxMap.color] ? String(row[idxMap.color]).trim() : 'N/A';
      
      const obj = {
        locationName:    location,
        sectionName,
        subSectionName,
        articleNo,
        colorName:       colorVal,
        category:        idxMap.cat >= 0 && row[idxMap.cat] ? String(row[idxMap.cat]).trim() : 'General',
        obsQty:          parseNumber(row[idxMap.obs]),
        netSlsQty:       parseNumber(row[idxMap.sls]),
        saleThruPercent: parseNumber(row[idxMap.thr], true),
        gitQty:          idxMap.git >= 0 ? parseNumber(row[idxMap.git]) : 0,
        cbsQty:          idxMap.cbs >= 0 ? parseNumber(row[idxMap.cbs]) : 0,
      }

      // DEBUG: Log first few objects to verify fields
      if (debugCounter < 5) {
         console.log('PARSER DEBUG - Extracted Obj:', JSON.stringify(obj));
         debugCounter++;
      }

      const result = rowSchema.safeParse(obj)
      return result.success ? result.data : null
    })
    .filter(Boolean)

  // 5. Send data in chunks to avoid blocking IPC
  const CHUNK_SIZE = 2000
  if (finalRows.length === 0) {
    parentPort.postMessage({ 
      type: 'DATA', 
      rows: [], 
      reportType: isConsolidated ? 'consolidated' : 'location',
      isLast: true
    })
  } else {
    for (let i = 0; i < finalRows.length; i += CHUNK_SIZE) {
      const chunk = finalRows.slice(i, i + CHUNK_SIZE)
      parentPort.postMessage({ 
        type: 'DATA', 
        rows: chunk, 
        reportType: isConsolidated ? 'consolidated' : 'location',
        isLast: (i + CHUNK_SIZE) >= finalRows.length
      })
    }
  }

  // Data audit log
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_processed_rows.json'),
      JSON.stringify(finalRows.slice(0, 10), null, 2)
    )
  } catch (e) {}
}

try {
  const { fileBuffer } = workerData
  processFile(fileBuffer)
} catch (error) {
  parentPort.postMessage({ type: 'ERROR', error: error.message })
}
