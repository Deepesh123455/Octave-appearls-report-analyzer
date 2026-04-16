import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  ArrowRightLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Box,
  Truck,
  Menu,
  X
} from 'lucide-react';

import {
  fetchSKUList,
  fetchSKUDetail,
  fetchTransferSuggestions
} from '../api';

import type {
  SKUDetail,
  TransferSuggestion,
  StoreBreakdown,
  SKUSummary,
  SKUStatus,
} from '../types';

import SKUSelector from '../components/SKUSelector';
import StockStatusBadge from '../components/StockStatusBadge';
import SalesBarChart from '../components/SalesBarChart';
import SellThroughGauge from '../components/SellThroughGauge';
import TransferManifest from '../components/TransferManifest';
import ColorSelector from '../components/ColorSelector';

const deriveStatus = (
  obsQty: number,
  cbsQty: number,
  gitQty: number,
  saleThruPct: number
): SKUStatus => {
  const totalAvailable = (cbsQty || 0) + (gitQty || 0);
  const safeSaleThru = saleThruPct || 0;

  // Critical: high demand, very low or no stock
  if (totalAvailable <= 0 && safeSaleThru >= 30) {
    return 'CRITICAL';
  }
  if (totalAvailable > 0 && safeSaleThru >= 60 && totalAvailable <= (obsQty || 0) * 0.2) {
    return 'CRITICAL';
  }

  // Overstock: low demand with high remaining stock
  if (safeSaleThru <= 25 && totalAvailable >= (obsQty || 0) * 0.7) {
    return 'OVERSTOCK';
  }

  return 'HEALTHY';
};

const DashboardPage: React.FC = () => {
  const [skus, setSkus] = useState<string[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [detail, setDetail] = useState<SKUDetail | null>(null);
  const [transfers, setTransfers] = useState<TransferSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'logistics'>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const [skuRes, transferRes] = await Promise.all([
          fetchSKUList(),
          fetchTransferSuggestions()
        ]);

        if (skuRes.success) {
          setSkus(skuRes.data);
          if (skuRes.data.length > 0) {
            setSelectedSku(skuRes.data[0]);
          }
        }

        if (transferRes.success) {
          setTransfers(transferRes.data);
        }
      } catch (err) {
        console.error('Init dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      const loadDetail = async () => {
        setDetailLoading(true);
        try {
          const res = await fetchSKUDetail(selectedSku);
          if (res.success) {
            setDetail(res.data);
          }
        } catch (err) {
          console.error('Load SKU detail error:', err);
        } finally {
          setDetailLoading(false);
        }
      };
      loadDetail();
    }
  }, [selectedSku]);

  useEffect(() => {
    // Reset color filter when user switches SKU
    setSelectedColor('ALL');
  }, [selectedSku]);

  useEffect(() => {
    if (!confirmUploadOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmUploadOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmUploadOpen]);

  const colorOptions = React.useMemo(() => {
    const rows = detail?.storeBreakdown || [];
    const uniq = Array.from(new Set(rows.map(r => r.colorName).filter(Boolean)));
    uniq.sort();
    return ['ALL', ...uniq];
  }, [detail]);

  const effectiveSelectedColor = colorOptions.includes(selectedColor) ? selectedColor : 'ALL';

  const selectedRows = React.useMemo<StoreBreakdown[]>(() => {
    const rows = detail?.storeBreakdown || [];
    if (effectiveSelectedColor === 'ALL') return rows;
    return rows.filter(r => r.colorName === effectiveSelectedColor);
  }, [detail, effectiveSelectedColor]);

  const enrichedRows = React.useMemo<StoreBreakdown[]>(() => {
    return (selectedRows || []).map((r) => ({
      ...r,
      status: deriveStatus(r.obsQty, r.cbsQty, r.gitQty, r.saleThruPct),
      inTransit: r.gitQty > 0,
    }));
  }, [selectedRows]);

  const aggregatedRowsForChart = React.useMemo<StoreBreakdown[]>(() => {
    const byLoc = new Map<
      string,
      { locationName: string; obsQty: number; cbsQty: number; gitQty: number; netSlsQty: number; saleThruWeightedSum: number }
    >();

    for (const r of selectedRows) {
      const key = r.locationName;
      if (!byLoc.has(key)) {
        byLoc.set(key, {
          locationName: key,
          obsQty: 0,
          cbsQty: 0,
          gitQty: 0,
          netSlsQty: 0,
          saleThruWeightedSum: 0,
        });
      }

      const item = byLoc.get(key)!;
      item.obsQty += r.obsQty || 0;
      item.cbsQty += r.cbsQty || 0;
      item.gitQty += r.gitQty || 0;
      item.netSlsQty += r.netSlsQty || 0;
      item.saleThruWeightedSum += (r.netSlsQty || 0) * (r.saleThruPct || 0);
    }

    return Array.from(byLoc.values()).map(item => {
      const avgSaleThru = item.netSlsQty > 0 ? item.saleThruWeightedSum / item.netSlsQty : 0;
      return {
        locationName: item.locationName,
        sectionName: 'N/A',
        colorName: effectiveSelectedColor,
        obsQty: item.obsQty,
        cbsQty: item.cbsQty,
        gitQty: item.gitQty,
        netSlsQty: item.netSlsQty,
        saleThruPct: avgSaleThru,
        status: deriveStatus(item.obsQty, item.cbsQty, item.gitQty, avgSaleThru),
        inTransit: item.gitQty > 0,
      };
    });
  }, [effectiveSelectedColor, selectedRows]);

  const summary = React.useMemo<SKUSummary>(() => {
    const totalObs = enrichedRows.reduce((sum, r) => sum + (r.obsQty || 0), 0);
    const totalCbs = enrichedRows.reduce((sum, r) => sum + (r.cbsQty || 0), 0);
    const totalGit = enrichedRows.reduce((sum, r) => sum + (r.gitQty || 0), 0);
    const totalSales = enrichedRows.reduce((sum, r) => sum + (r.netSlsQty || 0), 0);
    const totalWeightedSaleThru = enrichedRows.reduce(
      (sum, r) => sum + (r.netSlsQty || 0) * (r.saleThruPct || 0),
      0
    );

    const avgSaleThru = totalSales > 0 ? totalWeightedSaleThru / totalSales : 0;
    const storeCount = new Set(enrichedRows.map(r => r.locationName)).size;

    const overallStatus = deriveStatus(totalObs, totalCbs, totalGit, avgSaleThru);

    return {
      totalObs,
      totalCbs,
      totalGit,
      totalSales,
      avgSaleThru: Math.round(avgSaleThru * 10) / 10,
      overallStatus,
      inTransit: totalGit > 0,
      storeCount,
    };
  }, [enrichedRows]);

  if (loading) {
    return (
      <div className="enterprise-overlay">
        <div className="enterprise-loader">
          <RefreshCw className="animate-spin" size={48} />
          <p>Initializing Intelligence Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`enterprise-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="brand-header">
          <div className="brand-icon"><Zap size={20} fill="currentColor" /></div>
          <div>
            <div className="brand-name">OCTAVE</div>
            <div className="brand-sub">SCM INTELLIGENCE</div>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="side-nav">
          <button className="side-nav-link active">
            <LayoutDashboard size={18} />
            <span>Inventory Master</span>
            <ChevronRight size={14} className="chevron" />
          </button>
          <button className="side-nav-link" onClick={() => setConfirmUploadOpen(true)}>
            <ArrowLeft size={18} />
            <span>Upload New Data</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="dot pulse"></div>
            System Online: v1.5.0-LTS
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="enterprise-main">
        {/* Top Commmand Bar */}
        <header className="enterprise-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h1>Supply Chain Inventory Control</h1>
              <p>Real-time SKU performance across {summary?.storeCount || 0} locations</p>
            </div>
          </div>
          <div className="header-right">
            <SKUSelector
              skus={skus}
              selectedSku={selectedSku}
              onSelect={setSelectedSku}
            />
          </div>
        </header>

        {/* Selection Refinement Toolbar */}
        <AnimatePresence mode="popLayout">
          {detail?.storeBreakdown?.length ? (
            <motion.div
              key="sku-refinement-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="filter-toolbar"
            >
              <div className="filter-group">
                <Package size={14} className="filter-icon" />
                <span className="filter-label-inline">Active SKU: <strong>{selectedSku}</strong></span>
              </div>

              <div className="filter-divider"></div>

              <ColorSelector
                colors={colorOptions}
                selectedColor={effectiveSelectedColor}
                onSelect={setSelectedColor}
                label="Refine by Color"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={16} />
            Inventory Analytics
          </button>
          <button
            className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('logistics')}
          >
            <ArrowRightLeft size={16} />
            Logistics Hub
          </button>
        </div>

        {/* KPI Strip */}
        <div className="kpi-strip">
          <KPICard
            label="Total Opening Stock"
            value={summary?.totalObs || 0}
            icon={<Box size={20} />}
            trend={summary?.totalSales && summary?.totalObs ? `${Math.round((summary.totalSales / summary.totalObs) * 100)}%` : null}
            tooltip="Sum of all units across stores at start of report period"
          />
          <KPICard
            label="Closing Stock"
            value={summary?.totalCbs || 0}
            icon={<Package size={20} />}
            tooltip="Current live inventory standing in physical locations"
          />
          <KPICard
            label="Net Sales Qty"
            value={summary?.totalSales || 0}
            icon={<TrendingUp size={20} />}
            color="#4A7C59"
            tooltip="Total units sold (minus returns) during the period"
          />
          <KPICard
            label="Stock In-Transit"
            value={summary?.totalGit || 0}
            icon={<Truck size={20} />}
            color="#B07D3A"
            tooltip="Inventory currently between warehouses or stores"
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="dash-col-left"
            >
              {/* Visuals Row */}
              <div className="visuals-row">
                <div className="dash-card">
                  <div className="card-header">
                    <h3>Store Distribution</h3>
                    <p>Net sales breakdown by location</p>
                  </div>
                  <div className="card-body">
                    {detailLoading ? <div className="loading-shimmer" /> : (
                      <SalesBarChart data={aggregatedRowsForChart} />
                    )}
                  </div>
                </div>

                <div className="dash-card" style={{ maxWidth: '320px' }}>
                  <div className="card-header">
                    <h3>Sell-Through Performance</h3>
                    <p>Aggregate efficiency rate</p>
                  </div>
                  <div className="card-body center">
                    {detailLoading ? <div className="loading-shimmer circle" /> : (
                      <SellThroughGauge value={summary?.avgSaleThru || 0} />
                    )}
                  </div>
                </div>
              </div>

              {/* Store Table */}
              <div className="dash-card full-width">
                <div className="card-header space-between">
                  <div>
                    <h3>Location-Level Granularity</h3>
                    <p>Detailed breakdown of stock and sales per store</p>
                  </div>
                  <div className="status-legend">
                    <div className="legend-item"><div className="dot critical"></div> Critical</div>
                    <div className="legend-item"><div className="dot overstock"></div> Overstock</div>
                  </div>
                </div>
                <div className="card-body no-padding">
                  <div className="table-responsive">
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Color</th>
                          <th>Opening Stock</th>
                          <th>In Transit</th>
                          <th>Net Sales</th>
                          <th>Current Closing</th>
                          <th>Sell-Thru</th>
                          <th>Action Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence mode="popLayout" initial={false}>
                          {selectedRows.map((row) => (
                            <motion.tr
                              key={`${row.locationName}-${row.colorName}-${row.sectionName}`}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <td className="bold">{row.locationName}</td>
                              <td>{row.colorName}</td>
                              <td>{row.obsQty}</td>
                              <td style={{ color: row.gitQty > 0 ? '#D4A85A' : 'inherit' }}>
                                {row.gitQty > 0 ? `+${row.gitQty}` : '-'}
                              </td>
                              <td className="green-text">{row.netSlsQty}</td>
                              <td>{row.cbsQty}</td>
                              <td>
                                <div className="progress-mini">
                                  <div
                                    className="progress-fill"
                                    style={{
                                      width: `${Math.min(row.saleThruPct, 100)}%`,
                                      background: row.saleThruPct > 80 ? '#4A7C59' : row.saleThruPct > 40 ? '#B07D3A' : '#ef4444'
                                    }}
                                  />
                                  <span className="progress-text">{row.saleThruPct}%</span>
                                </div>
                              </td>
                              <td>
                                <StockStatusBadge status={row.status} inTransit={row.inTransit} />
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logistics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="dash-col-right"
            >
              <div className="dash-card transfer-panel">
                <div className="card-header">
                  <div className="header-icon"><ArrowRightLeft size={16} /></div>
                  <div>
                    <h3>Inter-store Transfer Engine</h3>
                    <p>Optimized suggestions to balance stock levels</p>
                  </div>
                </div>

                <div className="card-body no-padding">
                  <div className="transfer-list">
                    {detail?.storeBreakdown.some(s => s.locationName === 'NETWORK_WIDE') ? (
                      <div className="empty-state">
                        <AlertCircle size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
                        <h3>Multi-Store Context Required</h3>
                        <p>Inter-store transfers are disabled for consolidated reports as specific source and destination locations are not defined.</p>
                      </div>
                    ) : (
                      <TransferManifest suggestions={transfers} />
                    )}
                  </div>
                </div>
              </div>

              <div className="dash-card critical-alert" role="alert" aria-live="polite">
                <AlertCircle size={20} className="shake" />
                <div>
                  <h4>System Diagnostic</h4>
                  <p>Checked {selectedRows.length || 0} active rows and validated {(summary?.totalCbs || 0).toLocaleString()} units. Recommendations computed by SCM rules.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {confirmUploadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-upload-title"
          className="confirm-upload-overlay"
          onClick={() => setConfirmUploadOpen(false)}
        >
          <div
            className="confirm-upload-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-upload-title" id="confirm-upload-title">
              Confirm Upload
            </div>
            <div className="confirm-upload-body">
              This will take you back to the Upload page to refresh analytics.
              <br />
              Are you sure you want to continue?
            </div>
            <div className="confirm-upload-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmUploadOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setConfirmUploadOpen(false);
                  navigate('/');
                }}
              >
                Continue to Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ label, value, icon, color = '#D4A85A', trend, tooltip }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="kpi-card-enterprise"
    title={tooltip}
    aria-label={`${label}: ${value}`}
  >
    <div className="kpi-top">
      <div className="kpi-icon-box" style={{ color }}>{icon}</div>
      {trend && <div className="kpi-trend" aria-label="Trend indicator">{trend}</div>}
    </div>
    <div className="kpi-val">{value.toLocaleString()}</div>
    <div className="kpi-lab">{label}</div>
  </motion.div>
);

export default DashboardPage;
