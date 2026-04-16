import inventoryRepository from '../repositories/inventory.repository.js';

/**
 * Inventory Service
 * Manages business logic for inventory data
 */
class InventoryService {
  /**
   * Handle incoming parsed Excel data and pass it to the repository.
   * Ensures every record has a reportDate.
   * @param {Array} dataArray - Extracted rows from Excel
   * @param {string} reportDate - The date the report represents (YYYY-MM-DD)
   */
  async ingestData(dataArray, reportDate) {
    if (!reportDate) {
      throw new Error('Report date is required for ingestion');
    }

    // Attach reportDate to each record and ensure mandatory fields for unique constraint
    const recordsToIngest = dataArray.map(row => ({
      ...row,
      reportDate: reportDate,
      colorName: row.colorName || 'N/A', // Assuming N/A if missing for unique constraint
      fabric: row.fabric || 'N/A'
    }));

    return await inventoryRepository.upsertInventoryData(recordsToIngest);
  }

  /**
   * Fetch inventory data from the repository.
   * Acts as a drop-in replacement for the old local array.
   * @param {Object} filters - Query filters
   */
  async getInventoryData(filters = {}) {
    const data = await inventoryRepository.getInventoryDataForProcessing(filters);
    
    // The data is already structured as camelCase because our Drizzle schema 
    // uses camelCase JS keys and the repository returns them as is.
    return data;
  }
}

export default new InventoryService();
