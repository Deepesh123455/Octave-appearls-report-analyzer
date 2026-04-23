import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { db } from '../db/config.js'
import uploadRoutes from './routes/upload.routes.js'
import inventoryRoutes from './routes/inventory.routes.js'
import { inventorySnapshots } from '../db/schema.js'
import { sql } from 'drizzle-orm'
const app = express()
const initialPort = parseInt(process.env.PORT || '3000', 10)

// Middlewares
// Replace your existing app.use(cors()) with this:

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'https://octave-appearls-report-analyzer-pi3.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', uploadRoutes)
app.use('/api/inventory', inventoryRoutes)

// Reset endpoint: Clears all inventory data so user can re-upload with fixed mappings
app.post('/api/inventory/reset', async (req, res) => {
  try {
    await db.delete(inventorySnapshots);
    console.log('DATABASE RESET: All inventory_snapshots cleared.');
    res.json({ success: true, message: 'All inventory data cleared. You can now re-upload.' });
  } catch (err) {
    console.error('RESET ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get('/health', async (req, res) => {
  try {
    // Check DB and Table access
    const result = await db.execute(sql`SELECT count(*) FROM ${inventorySnapshots}`);
    const count = result.rows[0].count;
    res.status(200).json({
      status: 'OK',
      message: 'Backend & DB healthy!',
      records: count,
      port: process.env.PORT || initialPort
    })
  } catch (error) {
    console.error("Health Check Failure:", error.message);
    res.status(500).json({ status: 'ERROR', message: error.message })
  }
})
/**
 * Robust server start with port hunting and delay
 */
const startServer = (port, attempts = 0) => {
  if (attempts > 5) {
    console.error('Too many fail attempts to start server. Please kill ghost node processes manualy.')
    process.exit(1)
  }

  const server = app.listen(port, () => {
    console.log(`
  -------------------------------------------------------
  INVENTORY ANALYTICS BACKEND ACTIVE
  Port: ${port}
  Health: http://localhost:${port}/health
  -------------------------------------------------------
    `)
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, retrying with ${port + 1} in 500ms...`)
      setTimeout(() => startServer(port + 1, attempts + 1), 500)
    } else {
      console.error('Fatal Server Error:', err)
      process.exit(1)
    }
  })
}

// Small delay before first boot to allow previous process to clear
setTimeout(() => startServer(initialPort), 300)
