import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'
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
  async processFileUpload(fileBuffer) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(WORKER_PATH, {
        workerData: { fileBuffer }
      })

      worker.on('message', async (message) => {
        if (message.error) {
          reject(new Error(message.error))
        } else {
          // Store in repository
          await inventoryRepository.bulkInsert(message.rows)
          this.reportType = message.reportType || 'location'
          resolve({ count: message.rows.length })
        }
      })

      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
      })
    })
  }

  /**
   * Aggregate data for Treemap hierarchy
   */
  async getTreemapData() {
    const rows = await inventoryRepository.getAll()
    if (!rows.length) return []

    const root = {}

    rows.forEach(row => {
      const { locationName, sectionName, subSectionName, category, articleNo, netSlsQty, saleThruPercent, gitQty, cbsQty } = row

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
      art.value += netSlsQty
      art.saleThruPercent += saleThruPercent
      art.count += 1
      art.gitQty += gitQty
      art.cbsQty += cbsQty
    })

    // Recursive helper to transform to ECharts expected format
    const transform = (node, name) => {
      if (node.name) { // It's a leaf (Article No)
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

    return { data: Object.entries(root).map(([name, node]) => transform(node, name)), reportType: this.reportType }
  }
}

export default new DataService()
