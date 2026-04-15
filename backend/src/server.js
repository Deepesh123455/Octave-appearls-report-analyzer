import express from 'express'
import cors from 'cors'
import uploadRoutes from './routes/upload.routes.js'

const app = express()
const initialPort = parseInt(process.env.PORT || '3000', 10)

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', uploadRoutes)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' })
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
