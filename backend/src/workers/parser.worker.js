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
  category: z.string().default('General'),
  obsQty: z.number().default(0),
  netSlsQty: z.number().default(0),
  saleThruPercent: z.number().default(0),
  gitQty: z.number().default(0),
  cbsQty: z.number().default(0)
})

const JUNK_PATTERNS = [
  'total', 'summary', 'grand total', 'sub total', 'printed on', 'printed by'
]

const isJunkRow = (name) => {
  const n = name.toLowerCase().trim()
  if (!n) return true
  return JUNK_PATTERNS.some(p => n.includes(p)) || n.startsWith('printed')
}

const getIdx = (headers, exactName, synonyms = []) => {
  // Exact match first
  let idx = headers.indexOf(exactName)
  if (idx !== -1) return idx

  // Synonym match
  for (const syn of synonyms) {
    idx = headers.findIndex(h => h.toLowerCase().trim() === syn.toLowerCase().trim())
    if (idx !== -1) return idx
  }

  // Fuzzy match
  const target = exactName.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!target) return -1
  return headers.findIndex(h => {
    const nh = h.toLowerCase().replace(/[^a-z0-9]/g, '')
    return nh.includes(target)
  })
}

const processFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (!rows || rows.length === 0) throw new Error('Empty spreadsheet.')

  // ── 1. Find header row (works for both formats) ──────────────────────────
  let headerIndex = -1
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase().trim())
    if (row.includes('net sls qty') || row.includes('sale thru %') || row.includes('obs qty')) {
      headerIndex = i
      break
    }
  }
  if (headerIndex === -1) throw new Error('Could not find header row. Please ensure your file contains Net SLS Qty or Sale Thru % columns.')

  const headers = rows[headerIndex].map(h => String(h || '').trim())
  const rawDataRows = rows.slice(headerIndex + 1)

  // ── 2. Detect file format ─────────────────────────────────────────────────
  const hasLocationCol = headers.some(h => h.toLowerCase().includes('location name'))
  const isConsolidated = !hasLocationCol

  // Log detected format
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_headers.txt'),
      `FORMAT: ${isConsolidated ? 'CONSOLIDATED' : 'LOCATION'}\nHEADERS: ${headers.join(' | ')}`
    )
  } catch (e) {}

  // ── 3. Build column index map ─────────────────────────────────────────────
  const idxMap = {
    // Location report: has Location Name; consolidated: fallback to 'Consolidated'
    loc:   isConsolidated ? -1 : getIdx(headers, 'Location Name'),
    sec:   getIdx(headers, 'Section Name'),
    sub:   getIdx(headers, 'Sub Section Name'),
    // Location report uses "Asm" for article, consolidated uses "Article No"
    art:   isConsolidated
             ? getIdx(headers, 'Article No', ['article no', 'articleno', 'article'])
             : getIdx(headers, 'Asm', ['asm']),
    // Consolidated: Color Name as leaf; Location: not used
    color: getIdx(headers, 'Color Name', ['color name', 'colour name', 'color']),
    // Location report uses "Locgroup" for category; consolidated uses "Category"
    cat:   isConsolidated
             ? getIdx(headers, 'Category', ['category'])
             : getIdx(headers, 'Locgroup', ['locgroup', 'loc group']),
    obs:   getIdx(headers, 'OBS Qty',      ['obs qty', 'obsqty', 'obs']),
    sls:   getIdx(headers, 'Net SLS Qty',  ['net sls qty', 'netslsqty', 'net sales']),
    thr:   getIdx(headers, 'Sale Thru %',  ['sale thru %', 'salethru%', 'sell thru %', 'sale thru']),
    git:   getIdx(headers, 'GIT Qty',      ['git qty', 'gitqty', 'git']),
    cbs:   getIdx(headers, 'CBS Qty',      ['cbs qty', 'cbsqty', 'cbs']),
  }

  // ── 4. Parse rows ─────────────────────────────────────────────────────────
  const finalRows = rawDataRows
    .map(row => {
      // Determine location name
      let location
      if (isConsolidated) {
        // For consolidated: Article No is the top-level group (becomes the "location")
        location = idxMap.art >= 0 && row[idxMap.art] ? String(row[idxMap.art]).trim() : 'N/A'
        if (!location || location === 'N/A') return null
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
      const articleNo = isConsolidated
        ? (idxMap.color >= 0 && row[idxMap.color] ? String(row[idxMap.color]).trim() : sectionName)
        : (idxMap.art >= 0 && row[idxMap.art] ? String(row[idxMap.art]).trim() : 'N/A')

      const obj = {
        locationName:    location,
        sectionName,
        subSectionName,
        articleNo,
        category:        idxMap.cat >= 0 && row[idxMap.cat] ? String(row[idxMap.cat]).trim() : 'General',
        obsQty:          parseNumber(row[idxMap.obs]),
        netSlsQty:       parseNumber(row[idxMap.sls]),
        saleThruPercent: parseNumber(row[idxMap.thr], true),
        gitQty:          idxMap.git >= 0 ? parseNumber(row[idxMap.git]) : 0,
        cbsQty:          idxMap.cbs >= 0 ? parseNumber(row[idxMap.cbs]) : 0,
      }

      const result = rowSchema.safeParse(obj)
      return result.success ? result.data : null
    })
    .filter(Boolean)

  // Data audit log
  try {
    fs.writeFileSync(
      path.join(process.cwd(), 'debug_processed_rows.json'),
      JSON.stringify(finalRows.slice(0, 10), null, 2)
    )
  } catch (e) {}

  return { rows: finalRows, reportType: isConsolidated ? 'consolidated' : 'location' }
}

try {
  const { fileBuffer } = workerData
  const { rows, reportType } = processFile(fileBuffer)
  parentPort.postMessage({ rows, reportType })
} catch (error) {
  parentPort.postMessage({ error: error.message })
}
