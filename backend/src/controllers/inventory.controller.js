import inventoryService from '../services/inventory.service.js';
import skuService from '../services/sku.service.js';

/**
 * Inventory Controller
 * Handles HTTP requests for inventory operations
 */
class InventoryController {
  /**
   * Endpoint for ingesting parsed Excel data.
   * Expects { data: Array, reportDate: String } in body.
   */
  async ingest(req, res) {
    try {
      const { data, reportDate } = req.body;

      if (!data || !Array.isArray(data)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format. Expected an array of records.'
        });
      }

      const result = await inventoryService.ingestData(data, reportDate);

      return res.status(200).json({
        success: true,
        message: 'Data ingested successfully',
        count: result.count
      });
    } catch (error) {
      console.error('Ingestion error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Error ingesting data'
      });
    }
  }

  /**
   * Endpoint for fetching dashboard data (KPIs/Suggestions).
   * Passes query parameters as filters.
   */
  async getDashboardData(req, res) {
    try {
      const filters = req.query;
      const data = await inventoryService.getInventoryData(filters);

      return res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      console.error('Fetch data error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch inventory data'
      });
    }
  }

  /**
   * GET /api/inventory/skus
   * Returns a sorted list of all unique article numbers (SKUs).
   */
  async getSKUList(req, res) {
    try {
      const skus = await skuService.getSKUList();
      return res.status(200).json({ success: true, data: skus, count: skus.length });
    } catch (error) {
      console.error('SKU list error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch SKU list' });
    }
  }

  /**
   * GET /api/inventory/sku/:articleNo
   * Returns full analytics for a single SKU — per-store breakdown + summary KPIs.
   */
  async getSKUDetail(req, res) {
    try {
      const { articleNo } = req.params;
      if (!articleNo) {
        return res.status(400).json({ success: false, error: 'articleNo is required' });
      }
      const detail = await skuService.getSKUDetail(decodeURIComponent(articleNo));
      if (!detail) {
        return res.status(404).json({ success: false, error: 'SKU not found' });
      }
      return res.status(200).json({ success: true, data: detail });
    } catch (error) {
      console.error('SKU detail error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch SKU detail' });
    }
  }

  /**
   * GET /api/inventory/transfers
   * Returns cross-store transfer suggestions. Supports ?articleNo=... for SKU-specific recommendations.
   */
  async getTransferSuggestions(req, res) {
    try {
      const { articleNo } = req.query;
      let suggestions;

      if (articleNo) {
        suggestions = await skuService.getSKUTransferRecommendations(decodeURIComponent(articleNo));
      } else {
        suggestions = await skuService.getTransferSuggestions();
      }

      return res.status(200).json({ success: true, data: suggestions, count: suggestions.length });
    } catch (error) {
      console.error('Transfer suggestions error:', error);
      return res.status(500).json({ success: false, error: 'Failed to compute transfer suggestions' });
    }
  }
}

export default new InventoryController();
