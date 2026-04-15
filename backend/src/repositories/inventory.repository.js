/**
 * Repository for Inventory Data
 * Handles database operations (Mocked for this implementation)
 */
class InventoryRepository {
  constructor() {
    this.data = []
    this.uploadLogs = []
  }

  /**
   * Mock bulk-inserting data in batches of 1,000 rows
   * @param {Array} rows - Sanitized rows to insert
   */
  async bulkInsert(rows) {
    const BATCH_SIZE = 1000
    console.log(`Starting bulk insert of ${rows.length} rows...`)

    // Clear existing data before inserting new upload
    this.data = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      await new Promise(resolve => setTimeout(resolve, 50))
      this.data.push(...batch)
      console.log(`Inserted batch: ${i} to ${Math.min(i + BATCH_SIZE, rows.length)}`)
    }

    return { success: true, count: rows.length }
  }

  /**
   * Retrieve all sanitized rows
   */
  async getAll() {
    return this.data
  }

  /**
   * Log an upload event in memory
   * @param {string} fileName - Original name of the uploaded file
   * @param {number} recordCount - Number of records processed
   */
  async logUpload(fileName, recordCount) {
    const entry = {
      fileName,
      timestamp: new Date().toISOString(),
      totalRecords: recordCount
    }
    this.uploadLogs.push(entry)
    return entry
  }

  /**
   * Return all in-memory upload logs
   */
  async getLogs() {
    return this.uploadLogs
  }
}

export default new InventoryRepository()
