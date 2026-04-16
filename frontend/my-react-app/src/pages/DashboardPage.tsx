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
import StoreSelector from '../components/StoreSelector';

const deriveStatus = (
  obsQty: number,
  cbsQty: number,
  saleThruPct: number,
  netSlsQty: number
): { status: SKUStatus; reason: string } => {
  const stockOnHand = cbsQty || 0;
  const sales = netSlsQty || 0;
  const velocity = sales;
  const sellThru = saleThruPct || 0;
  
  // 1. OUT OF STOCK
  if (stockOnHand <= 0 && velocity > 0) {
    return { status: 'OUT_OF_STOCK', reason: "Zero stock detected while active sales demand exists. Lost sales opportunity." };
  }
  
  // 2. STAGNANT
  if (velocity <= 0 && stockOnHand > 0) {
    return { status: 'STAGNANT', reason: "No sales recorded in this period. Stock is immobile and tying up capital." };
  }
  
  // 3. Velocity-Based Coverage (Weeks of Stock)
  if (velocity > 0) {
    const wos = stockOnHand / velocity;
    
    if (wos < 0.8) {
      return { status: 'CRITICAL', reason: `Dangerously low stock lasts only ${wos.toFixed(1)} weeks. Refill immediately.` };
    }
    if (wos < 1.8) {
      return { status: 'LOW_STOCK', reason: `Stock depleting fast with ${wos.toFixed(1)} weeks of coverage. Replenishment required.` };
    }
    if (wos > 10) {
      return { status: 'OVERSTOCK', reason: `Excessive stock on hand. Current sales velocity will take >10 weeks to clear.` };
    }
  }

  // 4. Fallback to Sell-Through
  if (sellThru > 80 && stockOnHand < (obsQty * 0.2)) {
    return { status: 'CRITICAL', reason: "Extremely high sell-through (80%+) with very low remaining stock." };
  }
  if (sellThru < 10 && stockOnHand > (obsQty * 0.7)) {
    return { status: 'OVERSTOCK', reason: "Stagnant sell-through (<10%) while holding over 70% of opening inventory." };
  }

  return { status: 'HEALTHY', reason: "Healthy stock-to-sales balance. Inventory levels are optimal for current demand." };
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
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const toggleRow = (key: string) => {
    setExpandedRowKey(expandedRowKey === key ? null : key);
  };
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

    // ── Session Protection: Alert on Refresh ─────────────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Trigger a database reset in the background
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      navigator.sendBeacon(`${apiUrl}/api/inventory/reset`);
      
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome confirmation
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [navigate]);

  // Handle auto-redirect if data is wiped (happens after refresh)
  useEffect(() => {
    if (!loading && skus.length === 0) {
      navigate('/');
    }
  }, [skus, loading, navigate]);

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
    // Reset filters when user switches SKU
    setSelectedColor('ALL');
    setSelectedStore('ALL');
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

  const storeOptions = React.useMemo(() => {
    const rows = detail?.storeBreakdown || [];
    const uniq = Array.from(new Set(rows.map(r => r.locationName).filter(Boolean)));
    uniq.sort();
    return ['ALL', ...uniq];
  }, [detail]);

  const effectiveSelectedColor = colorOptions.includes(selectedColor) ? selectedColor : 'ALL';
  const effectiveSelectedStore = storeOptions.includes(selectedStore) ? selectedStore : 'ALL';

  const selectedRows = React.useMemo<StoreBreakdown[]>(() => {
    let rows = detail?.storeBreakdown || [];
    if (effectiveSelectedColor !== 'ALL') {
      rows = rows.filter(r => r.colorName === effectiveSelectedColor);
    }
    if (effectiveSelectedStore !== 'ALL') {
      rows = rows.filter(r => r.locationName === effectiveSelectedStore);
    }
    return rows;
  }, [detail, effectiveSelectedColor, effectiveSelectedStore]);

  const enrichedRows = React.useMemo<StoreBreakdown[]>(() => {
    return (selectedRows || []).map((r) => {
      const { status, reason } = deriveStatus(r.obsQty, r.cbsQty, r.saleThruPct, r.netSlsQty);
      return {
        ...r,
        status,
        statusReason: reason,
        inTransit: r.gitQty > 0,
      };
    });
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
      const { status, reason } = deriveStatus(item.obsQty, item.cbsQty, avgSaleThru, item.netSlsQty);
      return {
        locationName: item.locationName,
        sectionName: 'N/A',
        colorName: effectiveSelectedColor,
        obsQty: item.obsQty,
        cbsQty: item.cbsQty,
        gitQty: item.gitQty,
        netSlsQty: item.netSlsQty,
        saleThruPct: avgSaleThru,
        status,
        statusReason: reason,
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

    const { status: overallStatus, reason: overallReason } = deriveStatus(totalObs, totalCbs, avgSaleThru, totalSales);

    return {
      totalObs,
      totalCbs,
      totalGit,
      totalSales,
      avgSaleThru: Math.round(avgSaleThru * 10) / 10,
      overallStatus,
      overallReason,
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
          <button 
            className="sidebar-reset-btn"
            onClick={async () => {
              if (window.confirm("ARE YOU SURE? This will permanently delete ALL uploaded inventory records. You will need to re-upload your Excel files.")) {
                const { resetInventoryData } = await import('../api');
                try {
                  await resetInventoryData();
                  window.location.reload();
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  alert("Reset failed: " + errorMessage);
                }
              }
            }}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0.65rem',
              border: '1.5px solid rgba(192, 57, 43, 0.2)',
              background: 'rgba(192, 57, 43, 0.05)',
              borderRadius: '0.75rem',
              color: '#C0392B',
              fontSize: '11px',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} /> Reset All Data
          </button>
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

              <div className="refinement-controls">
                <ColorSelector
                  colors={colorOptions}
                  selectedColor={effectiveSelectedColor}
                  onSelect={setSelectedColor}
                  label="Color"
                />

                <StoreSelector
                  stores={storeOptions}
                  selectedStore={effectiveSelectedStore}
                  onSelect={setSelectedStore}
                  label="Store"
                />
              </div>
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
                          {enrichedRows.map((row) => {
                            const rowKey = `${row.locationName}-${row.colorName}-${row.sectionName}`;
                            const isExpanded = expandedRowKey === rowKey;
                            
                            return (
                              <React.Fragment key={rowKey}>
                                <motion.tr
                                  layout
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1, backgroundColor: isExpanded ? 'rgba(212, 168, 90, 0.04)' : 'transparent' }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={() => toggleRow(rowKey)}
                                  className={isExpanded ? 'row-expanded' : ''}
                                  style={{ cursor: 'pointer' }}
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
                                    <StockStatusBadge 
                                      status={row.status} 
                                      inTransit={row.inTransit} 
                                    />
                                  </td>
                                </motion.tr>
                                
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.tr
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                      className="diagnostic-row"
                                    >
                                      <td colSpan={8} style={{ padding: 0 }}>
                                        <div className="diagnostic-pane">
                                          <div className="diagnostic-accent" style={{ 
                                            backgroundColor: row.status === 'CRITICAL' || row.status === 'OUT_OF_STOCK' ? '#ef4444' : 
                                                            row.status === 'OVERSTOCK' ? '#7c3aed' : 
                                                            row.status === 'HEALTHY' ? '#059669' : '#78716c'
                                          }} />
                                          <div className="diagnostic-content">
                                            <div className="diag-header">
                                              <span className="diag-label">Intelligence Report</span>
                                              <span className="diag-status">
                                                Status: <strong style={{ color: 'var(--primary)' }}>{row.status.replace(/_/g, ' ')}</strong>
                                              </span>
                                            </div>
                                            <div className="diag-body">
                                              <p className="diag-reason">{row.statusReason}</p>
                                              <div className="diag-stats">
                                                <div className="diag-stat-item">
                                                  <span>Net Velocity</span>
                                                  <strong>{row.netSlsQty} units/period</strong>
                                                </div>
                                                <div className="diag-stat-separator" />
                                                <div className="diag-stat-item">
                                                  <span>Current Coverage</span>
                                                  <strong>{row.netSlsQty > 0 ? (row.cbsQty / row.netSlsQty).toFixed(1) : '∞'} weeks</strong>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {row.asm && row.asm !== 'N/A' && (
                                            <div style={{ 
                                              marginTop: '1rem', 
                                              paddingTop: '0.75rem', 
                                              borderTop: '1px dashed rgba(212, 168, 90, 0.15)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px'
                                            }}>
                                              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Store Leadership:</span>
                                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1C1917' }}>{row.asm}</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
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
