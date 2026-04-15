import dataService from '../services/data.service.js'

class UploadController {
  /**
   * Handle file upload and sanitization
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' })
      }

      const result = await dataService.processFileUpload(req.file.buffer)
      
      return res.status(200).json({
        success: true,
        message: 'File processed and sanitized successfully',
        data: result
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
}

export default new UploadController()
