import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  Printer, 
  FileText, 
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TransferSuggestion } from '../types';

interface TransferManifestProps {
  suggestions: TransferSuggestion[];
}

const TransferManifest: React.FC<TransferManifestProps> = ({ suggestions }) => {
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  // Group suggestions by destination store
  const groups = useMemo(() => {
    const map: Record<string, TransferSuggestion[]> = {};
    suggestions.forEach(s => {
      if (!map[s.toStore]) map[s.toStore] = [];
      map[s.toStore].push(s);
    });
    return map;
  }, [suggestions]);

  const sortedStores = Object.keys(groups).sort((a, b) => {
    const aUrgent = groups[a].some(s => s.urgency === 'HIGH');
    const bUrgent = groups[b].some(s => s.urgency === 'HIGH');
    
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    
    return a.localeCompare(b);
  });

  if (suggestions.length === 0) {
    return (
      <div className="empty-state">
        <Package size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
        <h3>No Inter-store Transfers Available</h3>
        <p>All locations currently maintain balanced stock levels relative to their sales performance.</p>
      </div>
    );
  }

  return (
    <div className="transfer-manifest-container">
      <div className="manifest-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 8px 16px'
      }}>
        <div style={{ fontSize: '13px', color: '#78716C' }}>
          <span style={{ fontWeight: 700, color: '#1C1917' }}>{suggestions.length}</span> optimized movements detected
        </div>
        <button className="btn-primary-lite" onClick={() => window.print()}>
          <Printer size={16} />
          Print Manifests
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedStores.map(storeName => {
          const storeSuggestions = groups[storeName];
          const isExpanded = expandedStore === storeName;
          const totalQty = storeSuggestions.reduce((acc, s) => acc + s.recommendedQty, 0);
          const hasHighUrgency = storeSuggestions.some(s => s.urgency === 'HIGH');

          return (
            <motion.div 
              key={storeName} 
              className="manifest-folder"
              initial={hasHighUrgency ? { y: -5, opacity: 0 } : false}
              animate={hasHighUrgency ? { y: 0, opacity: 1 } : false}
              style={{
              background: hasHighUrgency ? 'linear-gradient(to right, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.02))' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${hasHighUrgency ? 'rgba(239, 68, 68, 0.5)' : 'var(--ent-border)'}`,
              boxShadow: hasHighUrgency ? '0 4px 20px rgba(239, 68, 68, 0.15)' : 'none',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => setExpandedStore(isExpanded ? null : storeName)}
                style={{
                  width: '100%',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  background: isExpanded ? (hasHighUrgency ? 'rgba(239, 68, 68, 0.04)' : 'rgba(212, 168, 90, 0.06)') : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <motion.div 
                  className="folder-icon"
                  animate={hasHighUrgency ? { scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] } : {}}
                  transition={{ duration: 0.5, repeat: hasHighUrgency ? Infinity : 0, repeatDelay: 3 }}
                  style={{
                  width: '40px',
                  height: '40px',
                  background: hasHighUrgency ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 168, 90, 0.12)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  color: hasHighUrgency ? '#ef4444' : 'var(--ent-accent)'
                }}>
                  <Truck size={20} />
                </motion.div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: hasHighUrgency ? '#ef4444' : '#1C1917' }}>
                      To: {storeName}
                    </h4>
                    {hasHighUrgency && (
                      <motion.span 
                        animate={{ opacity: [1, 0.6, 1], scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ 
                          background: '#ef4444', 
                          color: 'white', 
                          fontSize: '10px', 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontWeight: 800,
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                          letterSpacing: '0.05em'
                        }}>
                        URGENT ACTION
                      </motion.span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ent-text-muted)', marginTop: '2px' }}>
                    Receiving {storeSuggestions.length} items • Total {totalQty} units
                    {storeSuggestions[0].toAsm && storeSuggestions[0].toAsm !== 'N/A' && (
                      <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '8px' }}>
                        • Manager: {storeSuggestions[0].toAsm}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right', display: 'none' /* Tablet+ only */ }}>
                    {/* Placeholder for tablet info */}
                  </div>
                  {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                  <div style={{ padding: '0 20px 20px' }}>
                      <div className="table-responsive">
                        <table className="enterprise-table" style={{ background: 'rgba(212, 168, 90, 0.06)', borderRadius: '12px' }}>
                          <thead>
                            <tr>
                              <th>SKU / Article</th>
                              <th>From Store</th>
                              <th style={{ textAlign: 'center' }}>In Stock</th>
                              <th style={{ textAlign: 'right' }}>Qty to Move</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeSuggestions.map((s, idx) => (
                              <tr key={`${s.articleNo}-${idx}`}>
                                <td>
                                  <div style={{ fontWeight: 700, color: '#1C1917' }}>{s.articleNo}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {s.category && s.category !== 'N/A' ? `${s.category} • ` : ''}{s.colorName || 'No Color Info'}
                                  </div>
                                  {s.urgency === 'HIGH' && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 600 }}>STOCK ALERT</div>}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <ArrowRight size={14} color="#64748b" />
                                      <span style={{ fontWeight: 600 }}>{s.fromStore}</span>
                                    </div>
                                    {s.fromAsm && s.fromAsm !== 'N/A' && (
                                      <span style={{ fontSize: '10px', color: '#94a3b8', paddingLeft: '22px' }}>
                                        {s.fromAsm}
                                      </span >
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', color: '#78716C' }}>
                                  {s.toCbs} units
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 800, color: '#4A7C59', fontSize: '15px' }}>
                                    +{s.recommendedQty}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div style={{ 
                        marginTop: '16px', 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '12px' 
                      }}>
                        <button className="btn-primary-lite" style={{ padding: '8px 16px', fontSize: '12px' }}>
                          <FileText size={14} />
                          Download Route Card
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TransferManifest;
