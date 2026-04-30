import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MoveRight, TrendingUp, Layers, ShieldCheck, Upload, Cpu, BarChart2, Lock, RefreshCw, Globe, CheckCircle2 } from 'lucide-react'
import Navbar from '../components/Navbar'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  const handleUploadClick = () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      navigate('/upload')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="lp-root">
      <Navbar />

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <motion.div
            className="lp-hero-text"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="lp-hero-pre-headline"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className='font-serif '>One file</span>
              <MoveRight className="w-10 h-5 opacity-75" strokeWidth={1.5} />
              <span className='font-serif '>Complete solution.</span>
            </motion.div>



            <h1 className="lp-headline">
              Transform inventory data into<br />
              <span className="lp-headline-accent">executive-grade insight.</span>
            </h1>
            <p className="lp-sub">
              Upload a single file. Get sales analytics, store-level diagnostics, and logistics intelligence — instantly
            </p>

            <div className="lp-hero-actions">
              <motion.button
                className="lp-btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUploadClick}
              >
                Upload Your Report <ArrowRight size={18} />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          className="lp-stats-bar"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {[
            { value: '100+', label: 'SKUs analyzed per report' },
            { value: '<30s', label: 'Average processing time' },
            { value: 'Auto', label: 'KPIs extracted — no manual setup' },
            { value: '256-bit', label: 'Encryption standard' },
          ].map((s, i) => (
            <div className="lp-stat" key={i}>
              <span className="lp-stat-value">{s.value}</span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </section>
      {/* Capabilities row */}
      <section className="lp-caps">
        <div className="lp-caps-inner">
          {[
            { Icon: TrendingUp, title: 'Inventory Analytics', desc: 'Sell-through rates, net sales, and in-transit stock mapped per location.' },
            { Icon: Layers, title: 'Logistics Hub', desc: 'Inter-store transfer management and dead-stock identification at scale.' },
            { Icon: ShieldCheck, title: 'Enterprise Ready', desc: 'Role-aware reporting with encrypted, transient data handling.' },
          ].map(({ Icon, title, desc }, i) => (
            <motion.div
              key={i}
              className="lp-cap-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="lp-cap-icon"><Icon size={20} /></div>
              <div>
                <div className="lp-cap-title">{title}</div>
                <div className="lp-cap-desc">{desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Showcase 1 */}
      <section className="lp-showcase">
        <div className="lp-showcase-inner">
          <motion.div
            className="lp-showcase-copy"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="lp-tag">Inventory Analytics</div>
            <h2 className="lp-showcase-title">Store-to-Store Inventory Analytics</h2>
            <p className="lp-showcase-desc">
              Instantly rank every location by net sales, visualize in-transit inventory, and monitor CBS Sell-Thru% across your entire network — without touching a formula.
            </p>
            <ul className="lp-showcase-bullets">
              <li>Full-network store ranking by volume</li>
              <li>Dual-axis: units + sell-through percentage</li>
              <li>Network-wide KPI aggregation</li>
            </ul>
          </motion.div>
          <motion.div
            className="lp-showcase-frame"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <img src="/ss1.png" alt="Inventory Analytics Dashboard" />
          </motion.div>
        </div>
      </section>

      {/* Showcase 2 */}
      <section className="lp-showcase lp-showcase--alt">
        <div className="lp-showcase-inner lp-showcase-inner--rev">
          <motion.div
            className="lp-showcase-copy"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="lp-tag lp-tag--green">Logistics Hub</div>
            <h2 className="lp-showcase-title">Your supply chain command center.</h2>
            <p className="lp-showcase-desc">
              Identify stores running critically low. Trigger precision transfers. Monitor on-hand, on-order, and in-transit quantities in a single operational view.
            </p>
            <ul className="lp-showcase-bullets">
              <li>Dead-stock lock-up detection</li>
              <li>Stockout revenue loss estimation</li>
              <li>Transfer manifest generation</li>
            </ul>
          </motion.div>
          <motion.div
            className="lp-showcase-frame"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <img src="/ss2.png" alt="Logistics Hub Dashboard" />
          </motion.div>
        </div>
      </section>

      {/* Showcase 3 - AI Chatbot */}
      <section className="lp-showcase">
        <div className="lp-showcase-inner">
          <motion.div
            className="lp-showcase-copy"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="lp-tag lp-tag--amber">AI Intelligence</div>
            <h2 className="lp-showcase-title">FileMind: Your AI Retail Intelligence.</h2>
            <p className="lp-showcase-desc">
              Meet your new SCM assistant. FileMind uses deep learning to answer complex inventory questions instantly, providing you with real-time stock-transfer recommendations and performance diagnostics.
            </p>
            <ul className="lp-showcase-bullets">
              <li>Understands files like a brain</li>
              <li>Automated Transfer Recommendations</li>
              <li>Granular SKU-Level Diagnostics</li>
            </ul>
          </motion.div>
          <motion.div
            className="lp-showcase-frame"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <img src="/ss3.png" alt="FileMind AI Assistant" />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="lp-hiw">
        <div className="lp-hiw-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="lp-kicker">Workflow</div>
            <h2 className="lp-section-title">From raw file to boardroom insight in 3 steps.</h2>
            <p className="lp-section-sub">No BI tools. No SQL. No data team required.</p>
          </motion.div>

          <div className="lp-hiw-steps">
            {[
              {
                step: '01',
                icon: <Upload size={24} />,
                title: 'Upload Your Report',
                desc: 'Drop a CSV or Excel file exported from any retail ERP. The engine accepts any columnar inventory format.'
              },
              {
                step: '02',
                icon: <Cpu size={24} />,
                title: 'Automated Intelligence',
                desc: 'Our SCM rules engine parses, classifies, and scores every SKU across all store locations in under 2 seconds.'
              },
              {
                step: '03',
                icon: <BarChart2 size={24} />,
                title: 'Live Dashboards Alerts',
                desc: 'View sell-through rates, trigger stock transfers, and export optimized logistics manifests — instantly.'
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="lp-hiw-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="lp-hiw-step-num">{item.step}</div>
                <div className="lp-hiw-icon">{item.icon}</div>
                <h3 className="lp-hiw-title">{item.title}</h3>
                <p className="lp-hiw-desc">{item.desc}</p>
                {i < 2 && <div className="lp-hiw-connector" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}


      {/* Trust & Security Bar */}
      <section className="lp-trust">
        <div className="lp-trust-inner">
          <motion.p
            className="lp-trust-label"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            ENTERPRISE SECURITY & COMPLIANCE
          </motion.p>
          <div className="lp-trust-badges">
            {[
              { icon: <Lock size={16} />, text: 'TLS 1.3 Encrypted' },
              { icon: <ShieldCheck size={16} />, text: 'Zero Data Retention' },
              { icon: <RefreshCw size={16} />, text: 'Stateless Sessions' },
              { icon: <CheckCircle2 size={16} />, text: 'Retail Standards Verified' },
              { icon: <Globe size={16} />, text: 'Multi-Region Ready' },
            ].map((b, i) => (
              <motion.div
                key={i}
                className="lp-trust-badge"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                {b.icon} {b.text}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="lp-footer-cta">
        <motion.div
          className="lp-footer-cta-inner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="lp-kicker">Get started today</div>
          <h2 className="lp-footer-cta-title">Ready to see how it works?</h2>
          <p className="lp-footer-cta-sub">Upload inventory. Get insights in seconds — no setup needed</p>
          <motion.button
            className="lp-btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUploadClick}
          >
            Upload Your Report <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      <footer className="lp-footer">
        <span>© 2025 YourCompany</span>
        <span>256-bit Encrypted · Retail Standards Verified · v2.5 Enterprise</span>
      </footer>
    </div>
  )
}

export default LandingPage
