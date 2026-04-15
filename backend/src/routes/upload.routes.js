import { Router } from 'express'
import multer from 'multer'
import uploadController from '../controllers/upload.controller.js'

const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

// File Upload endpoint
router.post('/upload', upload.single('file'), (req, res) => uploadController.uploadFile(req, res))

// Data visualization endpoint
router.get('/treemap', (req, res) => uploadController.getTreemapData(req, res))

export default router
