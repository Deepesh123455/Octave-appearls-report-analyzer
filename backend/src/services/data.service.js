import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'
import AIService from './ai.service.js'
import inventoryRepository from '../repositories/inventory.repository.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKER_PATH = path.join(__dirname, '../workers/parser.worker.js')

class DataService {
  constructor() {
    this.reportType = 'location' // default
  }

  /**
   * Process uploaded file via Worker Thread
   */
  async processFileUpload(fileBuffer, fileName, reportDate) {
    // 1. Pre-process headers and sample data for AI Mapping
    let aiMappings = null;
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      if (rows && rows.length > 0) {
        // Find header row — STRICT matching for actual column headers, not filter descriptions
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const row = rows[i].map(c => String(c || '').toLowerCase().trim());
          
          // Skip rows that are filter descriptions (they contain "filter" as part of a long string)
          const firstCell = String(rows[i][0] || '').toLowerCase();
          if (firstCell.includes('filter') || firstCell.includes('additional')) continue;
          
          // Require at least 2 distinct Octave header keywords as separate cell values
          const headerKeywords = ['obs qty', 'net sls qty', 'sale thru %', 'cbs qty', 'git qty', 'asm', 'location name', 'section name', 'article no'];
          const matchCount = headerKeywords.filter(kw => row.includes(kw)).length;
          if (matchCount >= 2) {
            headerIdx = i;
            break;
          }
        }
        
        if (headerIdx !== -1) {
          const headers = rows[headerIdx];
          const samples = rows.slice(headerIdx + 1, headerIdx + 16); // Send 15 rows for better analysis
          aiMappings = await AIService.resolveMappings(headers, samples);
          
          // AI returns `headerRowIndex` relative to the slice we pass into the prompt:
          // - `headers` are presented as "Row 0"
          // - `samples` are presented as "Row 1..N"
          // But the worker interprets `headerRowIndex` against the full sheet rows array.
          // Offset it so the worker can correctly locate the header row in the original sheet.
          if (aiMappings && typeof aiMappings.headerRowIndex === 'number') {
            aiMappings.headerRowIndex = headerIdx + aiMappings.headerRowIndex;
          } else if (aiMappings) {
            aiMappings.headerRowIndex = headerIdx;
          }
          console.log('AI MAPPING RESULT:', JSON.stringify(aiMappings, null, 2));
        }
      }
    } catch (err) {
      console.warn('AI PRE-PROCESS FAIL:', err.message);
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(WORKER_PATH, {
        workerData: { fileBuffer, aiMappings }
      })

      let totalRecords = 0
      let lastReportType = 'location'
      let activeIngestions = 0
      const chunkQueue = []
      let workerFinished = false

      const processQueue = async () => {
        if (activeIngestions >= 5 || chunkQueue.length === 0) return

        activeIngestions++
        const { rows, reportDate } = chunkQueue.shift()
        
        try {
          // Inject reportDate into each row for batching
          const rowBatch = rows.map(r => ({ ...r, reportDate }))
          await inventoryRepository.bulkInsert(rowBatch)
          activeIngestions--
          
          if (workerFinished && activeIngestions === 0 && chunkQueue.length === 0) {
            const logData = await inventoryRepository.logUpload(fileName, totalRecords)
            this.reportType = lastReportType
            resolve({ count: totalRecords, log: logData })
          } else {
            // Check if more can be processed
            processQueue()
          }
        } catch (err) {
          reject(err)
        }
      }

      worker.on('message', (message) => {
        if (message.type === 'ERROR') {
          reject(new Error(message.error))
        } else if (message.type === 'DATA') {
          totalRecords += message.rows.length
          lastReportType = message.reportType
          
          // Add to queue and kick off processing
          chunkQueue.push({ rows: message.rows, reportDate })
          processQueue()

          if (message.isLast) {
            workerFinished = true
            // If everything is already done, resolve now
            if (activeIngestions === 0 && chunkQueue.length === 0) {
              inventoryRepository.logUpload(fileName, totalRecords)
                .then(logData => {
                  this.reportType = lastReportType
                  resolve({ count: totalRecords, log: logData })
                })
            }
          }
        }
      })

      worker.on('error', (err) => {
        console.error('Worker error:', err)
        reject(err)
      })
      
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
      })
    })
  }

  /**
   * Aggregate raw Supabase rows for Treemap hierarchy analysis.
   */
  async getTreemapData() {
    const rows = await inventoryRepository.getAll()
    if (!rows || !rows.length) return { data: [], reportType: this.reportType }

    const root = {}

    // Process raw database rows into hierarchy
    rows.forEach(row => {
      // Map database field names to local analytics labels
      const { locationName, sectionName, subSectionName, category, articleNo, netSlsQty, saleThruPct, gitQty, cbsQty } = row

      if (!root[locationName]) root[locationName] = { children: {} }
      const loc = root[locationName].children

      if (!loc[sectionName]) loc[sectionName] = { children: {} }
      const sec = loc[sectionName].children

      if (!sec[subSectionName]) sec[subSectionName] = { children: {} }
      const sub = sec[subSectionName].children

      if (!sub[category]) sub[category] = { children: {} }
      const cat = sub[category].children

      if (!cat[articleNo]) {
        cat[articleNo] = { name: articleNo, value: 0, saleThruPercent: 0, count: 0, gitQty: 0, cbsQty: 0 }
      }
      
      const art = cat[articleNo]
      art.value += (netSlsQty || 0)
      art.saleThruPercent += (saleThruPct || 0)
      art.count += 1
      art.gitQty += (gitQty || 0)
      art.cbsQty += (cbsQty || 0)
    })

    // Recursive helper to transform to ECharts expected format
    const transform = (node, name) => {
      if (node.name) { // Leaf node (usually Article or Color)
        return {
          name: node.name,
          value: Math.max(0, node.value),
          saleThruPercent: Math.max(0, node.count > 0 ? node.saleThruPercent / node.count : 0),
          gitQty: node.gitQty || 0,
          cbsQty: node.cbsQty || 0
        }
      }

      const children = Object.entries(node.children || {}).map(([key, value]) => transform(value, key))
      
      // Aggregate values for parent nodes
      const totalValue = children.reduce((sum, child) => sum + (child.value || 0), 0)
      const avgSaleThruPercent = children.reduce((sum, child) => sum + (child.saleThruPercent || 0), 0) / (children.length || 1)
      const totalGitQty = children.reduce((sum, child) => sum + (child.gitQty || 0), 0)
      const totalCbsQty = children.reduce((sum, child) => sum + (child.cbsQty || 0), 0)

      return {
        name,
        value: totalValue,
        saleThruPercent: Math.max(0, avgSaleThruPercent),
        gitQty: totalGitQty,
        cbsQty: totalCbsQty,
        children
      }
    }

    const data = Object.entries(root).map(([name, node]) => transform(node, name))
    return { data, reportType: this.reportType }
  }
}

export default new DataService()
