import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Upload, Loader2, XCircle, Info } from 'lucide-react'
import { uploadInventoryFile } from '../api'

const UploadPage: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startProgressSimulation = (to: number, stepMs: number) => {
    if (progressRef.current) clearInterval(progressRef.current)
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= to) {
          clearInterval(progressRef.current!)
          return to
        }
        const remaining = to - prev
        const increment = Math.max(0.3, remaining * 0.04)
        return Math.min(to, prev + increment)
      })
    }, stepMs)
  }

  const handleUpload = async (selectedFile: File) => {
    setError(null)
    setIsUploading(true)
    setProgress(0)

    // Phase 1: Simulate upload 0 → 70%
    startProgressSimulation(70, 40)

    try {
      await uploadInventoryFile(selectedFile, () => {})

      // Phase 2: Server parsing → 70 → 95%
      startProgressSimulation(95, 60)

      // Phase 3: Done → snap to 100% and navigate
      setTimeout(() => {
        if (progressRef.current) clearInterval(progressRef.current)
        setProgress(100)
        setTimeout(() => navigate('/analytics'), 600)
      }, 800)
    } catch (err: unknown) {
      if (progressRef.current) clearInterval(progressRef.current)
      const message = err instanceof Error ? err.message : 'Validation failed. Please check your file format.'
      setError(message)
      setIsUploading(false)
      setProgress(0)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0])
  }

  return (
    <div className="premium-portal-wrapper">
      {/* Dynamic Background Elements */}
      <div className="aurora-blob aurora-1"></div>
      <div className="aurora-blob aurora-2"></div>
      <div className="aurora-blob aurora-3"></div>

      <main className="portal-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="portal-header"
        >
          <div className="brand-tag">OCTAVE APPARELS</div>
          <h1>Intelligence at your fingertips</h1>
          <p>Securely upload your inventory report to unlock deep sales insights.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`portal-glass-card ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            accept=".csv,.xlsx,.xls"
          />

          <AnimatePresence mode="wait">
            {!isUploading ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="portal-zone-inner"
              >
                <div className="portal-icon-wrapper">
                  <Upload size={32} strokeWidth={1.5} />
                </div>
                <h3>Drop your report here</h3>
                <p>Support for CSV, XLS, and XLSX files</p>
                <div className="browse-badge">Click to Browse</div>
              </motion.div>
            ) : (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="portal-upload-status"
              >
                <div className="status-indicator">
                  <Loader2 className="animate-spin" size={72} color="var(--primary)" />
                  <div className="progress-value">{Math.round(progress)}%</div>
                </div>
                <h2>
                  {progress < 70 ? 'Uploading File...' : progress < 95 ? 'Analyzing Records' : 'Finalizing...'}
                </h2>
                <p>
                  {progress < 70 ? 'Transferring your data securely...' : progress < 95 ? 'Establishing data hierarchy...' : 'Almost ready!'}
                </p>
                {/* Progress Bar */}
                <div style={{
                  width: '100%', height: '6px', borderRadius: '999px',
                  background: 'rgba(129,140,248,0.15)', marginTop: '16px', overflow: 'hidden'
                }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: '999px',
                      background: 'linear-gradient(90deg, #92400E, #B07D3A, #D4A85A)',
                      boxShadow: '0 0 12px rgba(176, 125, 58, 0.5)'
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="portal-error-msg"
            >
              <XCircle size={16} /> {error}
            </motion.div>
          )}
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="portal-footer"
        >
          <div className="badge-item"><Info size={14} /> HIPAA Compliant</div>
          <div className="badge-separator"></div>
          <div className="badge-item">Enterprise Grade Security</div>
        </motion.footer>
      </main>
    </div>
  )
}

export default UploadPage
