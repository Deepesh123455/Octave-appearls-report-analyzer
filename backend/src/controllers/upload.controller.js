import dataService from '../services/data.service.js'
import inventoryRepository from '../repositories/inventory.repository.js'

class UploadController {
  /**
   * Handle file upload and sanitization
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' })
      }

      const fileName = req.file.originalname || 'unknown_file.csv'
      const result = await dataService.processFileUpload(req.file.buffer, fileName)
      
      return res.status(200).json({
        success: true,
        message: 'File processed and sanitized successfully',
        data: {
          ...result,
          uploadedAt: result.log.timestamp,
          fileName: result.log.fileName
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Error processing file'
      })
    }
  }

  /**
   * Fetch hierarchical data for the treemap
   */
  async getTreemapData(req, res) {
    try {
      const { data, reportType } = await dataService.getTreemapData()
      return res.status(200).json({
        success: true,
        data,
        reportType
      })
    } catch (error) {
      console.error('Treemap data fetch error:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch visualization data'
      })
    }
  }

  /**
   * Return all in-memory upload logs
   */
  async getUploadLogs(req, res) {
    try {
      const logs = await inventoryRepository.getLogs()
      return res.status(200).json({
        success: true,
        data: logs
      })
    } catch (error) {
      console.error('Get logs error:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch upload logs'
      })
    }
  }
}

export default new UploadController()
