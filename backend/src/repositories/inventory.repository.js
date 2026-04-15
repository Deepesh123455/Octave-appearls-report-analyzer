/**
 * Repository for Inventory Data
 * Handles database operations (Mocked for this implementation)
 */
class InventoryRepository {
  constructor() {
    this.data = []
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
}

export default new InventoryRepository()
