import inventoryRepository from '../repositories/inventory.repository.js';


class InventoryService {

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


  async getInventoryData(filters = {}) {
    const data = await inventoryRepository.getInventoryDataForProcessing(filters);


    return data;
  }
}

export default new InventoryService();
