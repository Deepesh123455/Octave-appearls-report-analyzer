import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller.js';

const router = Router();

// Ingest parsed data
router.post('/ingest', (req, res) => inventoryController.ingest(req, res));

// Get dashboard data (legacy)
router.get('/dashboard', (req, res) => inventoryController.getDashboardData(req, res));

// ── New SKU Intelligence Endpoints ──────────────────────────────────────────
// Get all unique SKU (article) numbers
router.get('/skus', (req, res) => inventoryController.getSKUList(req, res));

// Get full per-store detail for ONE SKU
router.get('/sku/:articleNo', (req, res) => inventoryController.getSKUDetail(req, res));

// Get cross-store transfer suggestions
router.get('/transfers', (req, res) => inventoryController.getTransferSuggestions(req, res));

export default router;
