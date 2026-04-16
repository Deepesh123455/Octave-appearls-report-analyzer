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

  const sortedStores = Object.keys(groups).sort();

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
            <div key={storeName} className="manifest-folder" style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${hasHighUrgency ? 'rgba(239, 68, 68, 0.2)' : 'var(--ent-border)'}`,
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
                  background: isExpanded ? 'rgba(212, 168, 90, 0.06)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div className="folder-icon" style={{
                  width: '40px',
                  height: '40px',
                    background: hasHighUrgency ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 168, 90, 0.12)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  color: hasHighUrgency ? '#ef4444' : 'var(--ent-accent)'
                }}>
                  <Truck size={20} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1C1917' }}>
                      To: {storeName}
                    </h4>
                    {hasHighUrgency && (
                      <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        URGENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ent-text-muted)', marginTop: '2px' }}>
                    Receiving {storeSuggestions.length} items • Total {totalQty} units
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
                                {s.urgency === 'HIGH' && <div style={{ color: '#ef4444', fontSize: '10px' }}>Stock Alert</div>}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ArrowRight size={14} color="#64748b" />
                                  <span>{s.fromStore}</span>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransferManifest;
