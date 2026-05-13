import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import SalesBarChart from '../SalesBarChart';
import SellThroughGauge from '../SellThroughGauge';
import StockStatusBadge from '../StockStatusBadge';
import type { StoreBreakdown, SKUSummary } from '../../types';

interface AnalyticsTabProps {
  detailLoading: boolean;
  aggregatedRowsForChart: StoreBreakdown[];
  summary: SKUSummary | null;
  paginatedRows: StoreBreakdown[];
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  totalPages: number;
  pageSize: number;
  enrichedRows: StoreBreakdown[];
  expandedRowKey: string | null;
  toggleRow: (key: string) => void;
}

// Helper: format a number for display, show – for zero/null
const fmt = (val: number | null | undefined, decimals = 0) => {
  if (val === null || val === undefined) return '—';
  if (val === 0) return '—';
  return Number(val).toFixed(decimals);
};

const fmtCurrency = (val: number | null | undefined) => {
  if (val === null || val === undefined || val === 0) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

// ── Expanded Detail Pane ─────────────────────────────────────────────────────
const DetailPane: React.FC<{ row: StoreBreakdown }> = ({ row }) => {
  // Build metric groups — only show fields that have actual data
  const qtyFields = [
    { label: 'Opening Stock',       value: fmt(row.obsQty) },
    { label: 'Closing Stock',       value: fmt(row.cbsQty) },
    { label: 'In Transit',          value: fmt(row.gitQty) },
    { label: 'Net Sales',           value: fmt(row.netSlsQty) },
    { label: 'Grp Purchase Qty',    value: fmt(row.groupPurQty) },
    { label: 'Grp Print Qty',       value: fmt(row.groupPrtQty) },
    { label: 'DC Qty',              value: fmt(row.deliveryChallanQty) },
    { label: 'Grp Wholesale Qty',   value: fmt(row.groupWslQty) },
    { label: 'Return Qty',          value: fmt(row.returnQty) },
    { label: 'Transfer In',         value: fmt(row.transferInQty) },
    { label: 'Transfer Out',        value: fmt(row.transferOutQty) },
    { label: 'Damaged / Shrinkage', value: fmt(row.damagedQty) },
  ].filter(f => f.value !== '—');

  const finFields = [
    { label: 'MRP',             value: fmtCurrency(row.mrp) },
    { label: 'ASP',             value: fmtCurrency(row.asp) },
    { label: 'Net Sales Value', value: fmtCurrency(row.netSalesValue) },
    { label: 'Cost Price',      value: fmtCurrency(row.costPrice) },
    { label: 'Discount %',      value: row.discountPct ? `${row.discountPct.toFixed(1)}%` : '—' },
  ].filter(f => f.value !== '—');

  const attrFields = [
    { label: 'Description', value: row.description },
    { label: 'Fabric',      value: row.fabric },
    { label: 'Brand',       value: row.brand },
    { label: 'Gender',      value: row.gender },
    { label: 'Season',      value: row.season },
    { label: 'Style Code',  value: row.styleCode },
    { label: 'Size',        value: row.size },
    { label: 'Sub Section', value: row.subSectionName },
    { label: 'Category',    value: row.category },
  ].filter(f => f.value && f.value !== 'N/A');

  const orgFields = [
    { label: 'ASM',           value: row.asm },
    { label: 'Region',        value: row.region },
    { label: 'Zone',          value: row.zone },
    { label: 'Store Grade',   value: row.storeGrade },
  ].filter(f => f.value && f.value !== 'N/A');

  const wos = row.netSlsQty > 0 ? (row.cbsQty / row.netSlsQty).toFixed(1) : '∞';

  return (
    <div className="diagnostic-pane">
      <div className="diagnostic-accent" style={{
        backgroundColor: row.status === 'CRITICAL' || row.status === 'OUT_OF_STOCK' ? '#ef4444'
          : row.status === 'OVERSTOCK' ? '#7c3aed'
          : row.status === 'HEALTHY' ? '#059669' : '#78716c'
      }} />

      <div className="diagnostic-content" style={{ width: '100%' }}>
        {/* Header */}
        <div className="diag-header">
          <span className="diag-label">Intelligence Report</span>
          <span className="diag-status">
            Status: <strong style={{ color: 'var(--primary)' }}>{row.status.replace(/_/g, ' ')}</strong>
          </span>
        </div>

        {/* Stock Coverage */}
        <div className="diag-body">
          <div className="diag-stats">
            <div className="diag-stat-item">
              <span>Net Velocity</span>
              <strong>{row.netSlsQty} units/period</strong>
            </div>
            <div className="diag-stat-separator" />
            <div className="diag-stat-item">
              <span>Weeks of Stock</span>
              <strong>{wos} wks</strong>
            </div>
            <div className="diag-stat-separator" />
            <div className="diag-stat-item">
              <span>Sell-Through</span>
              <strong>{row.saleThruPct.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        {/* Quantity Grid */}
        {qtyFields.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.08em' }}>
              Quantity Breakdown
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginTop: '6px' }}>
              {qtyFields.map(f => (
                <div key={f.label} style={{
                  background: 'rgba(212,168,90,0.06)', borderRadius: '6px', padding: '6px 10px',
                  border: '1px solid rgba(212,168,90,0.12)'
                }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1917', marginTop: '2px' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Grid */}
        {finFields.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.08em' }}>
              Financial Metrics
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginTop: '6px' }}>
              {finFields.map(f => (
                <div key={f.label} style={{
                  background: 'rgba(74,124,89,0.06)', borderRadius: '6px', padding: '6px 10px',
                  border: '1px solid rgba(74,124,89,0.15)'
                }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1917', marginTop: '2px' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Attributes */}
        {attrFields.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(212,168,90,0.15)' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.08em' }}>
              Product Attributes
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {attrFields.map(f => (
                <div key={f.label} style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                  background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#374151'
                }}>
                  <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{f.label}: </span>
                  <span style={{ fontWeight: 600 }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organization Info */}
        {orgFields.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {orgFields.map(f => (
              <span key={f.label} style={{ fontSize: '11px', color: '#6B7280' }}>
                <strong style={{ color: '#374151' }}>{f.label}:</strong> {f.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  detailLoading, aggregatedRowsForChart, summary, paginatedRows,
  currentPage, setCurrentPage, totalPages, pageSize,
  enrichedRows, expandedRowKey, toggleRow
}) => {
  const [showAllCols, setShowAllCols] = React.useState(false);

  return (
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
            <p>Detailed breakdown — click any row to expand all data</p>
          </div>
          <button
            onClick={() => setShowAllCols(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: 600, padding: '6px 14px',
              borderRadius: '8px', border: '1px solid rgba(212,168,90,0.3)',
              background: showAllCols ? 'rgba(212,168,90,0.12)' : 'transparent',
              color: '#D4A85A', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {showAllCols ? <EyeOff size={13} /> : <Eye size={13} />}
            {showAllCols ? 'Compact View' : 'All Columns'}
          </button>
        </div>

        <div className="card-body no-padding">
          <div className="table-responsive">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Color</th>
                  {showAllCols && <th>OBS</th>}
                  <th>In Transit</th>
                  {showAllCols && <th>Grp Pur</th>}
                  {showAllCols && <th>Grp Prt</th>}
                  {showAllCols && <th>DC Qty</th>}
                  {showAllCols && <th>Grp Wsl</th>}
                  <th>Net Sales</th>
                  {showAllCols && <th>Returns</th>}
                  <th>Closing</th>
                  <th>Sell-Thru</th>
                  {showAllCols && <th>MRP</th>}
                  {showAllCols && <th>ASP</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout" initial={false}>
                  {paginatedRows.map((row) => {
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
                          {showAllCols && <td>{row.obsQty || '—'}</td>}
                          <td style={{ color: row.gitQty > 0 ? '#D4A85A' : 'inherit' }}>
                            {row.gitQty > 0 ? `+${row.gitQty}` : '—'}
                          </td>
                          {showAllCols && <td>{row.groupPurQty || '—'}</td>}
                          {showAllCols && <td>{row.groupPrtQty || '—'}</td>}
                          {showAllCols && <td>{row.deliveryChallanQty || '—'}</td>}
                          {showAllCols && <td>{row.groupWslQty || '—'}</td>}
                          <td className="green-text">{row.netSlsQty}</td>
                          {showAllCols && <td>{row.returnQty || '—'}</td>}
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
                              <span className="progress-text">{row.saleThruPct?.toFixed(1)}%</span>
                            </div>
                          </td>
                          {showAllCols && <td>{row.mrp ? `₹${row.mrp}` : '—'}</td>}
                          {showAllCols && <td>{row.asp ? `₹${row.asp}` : '—'}</td>}
                          <td>
                            <StockStatusBadge status={row.status} inTransit={row.inTransit} />
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
                              <td colSpan={showAllCols ? 16 : 8} style={{ padding: 0 }}>
                                <DetailPane row={row} />
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="table-pagination">
              <div className="pagination-info">
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, enrichedRows.length)}</strong> of{' '}
                <strong>{enrichedRows.length}</strong> records
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`page-num ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsTab;
