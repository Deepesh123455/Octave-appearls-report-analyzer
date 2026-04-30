import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  detailLoading,
  aggregatedRowsForChart,
  summary,
  paginatedRows,
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize,
  enrichedRows,
  expandedRowKey,
  toggleRow
}) => {
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
                  <th>In Transit</th>
                  <th>Net Sales</th>
                  <th>Current Closing</th>
                  <th>Sell-Thru</th>
                  <th>Action Status</th>
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="table-pagination">
              <div className="pagination-info">
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, enrichedRows.length)}</strong> of <strong>{enrichedRows.length}</strong> locations
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
