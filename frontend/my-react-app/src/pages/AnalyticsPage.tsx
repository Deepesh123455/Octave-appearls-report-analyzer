import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeft, TrendingUp, Package, MapPin } from 'lucide-react'
import { fetchTreemapData } from '../api'
import DrilldownChart from '../components/DrilldownChart'

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([])
  const [reportType, setReportType] = useState<string>('location')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchTreemapData()
        setData(res?.data || [])
        setReportType(res?.reportType || 'location')
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Calculate high-level KPIs
  const totalSales = data.reduce((sum, loc) => sum + (loc.value || 0), 0)
  const totalLocations = data.length
  const topPerformer = [...data].sort((a,b) => b.value - a.value)[0]?.name || 'N/A'

  return (
    <div className="analytics-page-shell">
      <nav className="side-nav">
        <div className="nav-logo">OCTAVE</div>
        <div className="nav-items">
          <button className="nav-btn active"><LayoutDashboard size={20} /> Overview</button>
          <button onClick={() => navigate('/')} className="nav-btn"><ArrowLeft size={20} /> New Upload</button>
        </div>
      </nav>

      <main className="analytics-main">
        <header className="page-header">
          <div>
            <h1>Performance Overview</h1>
            <p>Real-time analytics for Octave retail operations</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="last-updated"
          >
            Live Dataset
          </motion.div>
        </header>

        <section className="kpi-grid">
          <KPICard title="Total Sales Qty" value={totalSales.toLocaleString()} icon={<TrendingUp />} color="var(--primary)" />
          <KPICard title="Active Locations" value={totalLocations} icon={<MapPin />} color="#0ea5e9" />
          <KPICard title="Top Location" value={topPerformer} icon={<Package />} color="#22c55e" />
        </section>

        <section className="main-viz-card glass-morphism">
          <div className="viz-header">
            <h2>Inventory Drill-Down</h2>
            <p>Click bars to explore deeper levels</p>
          </div>
          <div className="viz-content">
            {loading ? (
              <div className="loader-container">Fetching Analytics...</div>
            ) : (
              data.length > 0 ? (
                <DrilldownChart data={data} reportType={reportType} />
              ) : (
                <div className="empty-prompt">No data found. Please go back and upload a valid report.</div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

const KPICard = ({ title, value, icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="kpi-card glass-morphism"
  >
    <div className="kpi-icon" style={{ backgroundColor: `${color}20`, color }}>
      {icon}
    </div>
    <div className="kpi-info">
      <span className="kpi-title">{title}</span>
      <span className="kpi-value">{value}</span>
    </div>
  </motion.div>
)

export default AnalyticsPage
